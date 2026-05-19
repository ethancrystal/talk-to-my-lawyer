/**
 * Headless Puppeteer smoke test for the LangGraph letter-generation pipeline.
 *
 * Drives the deployed (or local-dev) Talk-to-My-Lawyer web UI:
 *   1. Logs in as the seeded subscriber test account.
 *   2. Walks the 6-step /submit intake form.
 *   3. Submits a tagged demand letter.
 *   4. Polls Supabase directly until the letter advances to a draft/post-draft status.
 *   5. Prints the resulting state + a snippet of the generated letter text.
 *
 * Why this script exists: phase92 + phase93 cover the LangGraph state machine
 * itself, but neither exercises auth → tRPC submit → pg-boss → worker →
 * pipeline → DB persistence end-to-end. This does.
 *
 * Run:
 *   SMOKE_TARGET_URL=https://your-vercel-preview.vercel.app \
 *   tsx scripts/smoke-pipeline-via-ui.ts
 *
 * Defaults:
 *   SMOKE_TARGET_URL   = http://localhost:3000
 *   SUBSCRIBER_EMAIL   = subscriber@ttml.dev (per CLAUDE.md §12.4)
 *   SUBSCRIBER_PASS    = TestPass123!
 *   POLL_TIMEOUT_MS    = 180000  (3 min)
 *   HEADLESS           = "new"   (set HEADLESS=false to watch it run)
 *
 * Required env (loaded from parent .env if not already set):
 *   DATABASE_URL — used to poll letter_requests row directly
 *
 * Side effects (you should know this before running):
 *   - Creates ONE letter_requests row in whichever Supabase the target's
 *     backend points at. Subject tag is "SMOKE_PIPELINE_VIA_UI <timestamp>"
 *     so the row is trivially findable and deletable.
 *   - Burns ~$0.10–0.20 in LLM API tokens (per the failover chain).
 *   - Does NOT touch Stripe, attorney review, paywall unlock, or PDF.
 */

import puppeteer, { type Browser, type Page } from "puppeteer";
import postgres from "postgres";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Env loading ─────────────────────────────────────────────────────

function loadParentEnv() {
  const candidates = [
    path.resolve(__dirname, "..", ".env"),
    path.resolve(__dirname, "..", "..", ".env"),
    path.resolve(__dirname, "..", "..", "..", ".env"),
    path.resolve(__dirname, "..", "..", "..", "..", ".env"),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
    return;
  }
}

loadParentEnv();

// ─── Config ──────────────────────────────────────────────────────────

const TARGET_URL = process.env.SMOKE_TARGET_URL || "http://localhost:3000";
const EMAIL = process.env.SUBSCRIBER_EMAIL || "subscriber@ttml.dev";
const PASS = process.env.SUBSCRIBER_PASS || "TestPass123!";
const POLL_TIMEOUT_MS = Number(process.env.POLL_TIMEOUT_MS || 180_000);
const HEADLESS = process.env.HEADLESS === "false" ? false : "new";
const DB_URL = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!DB_URL) {
  console.error("[smoke] DATABASE_URL (or SUPABASE_DATABASE_URL) is required for polling — set it in .env");
  process.exit(2);
}

const TAG = `SMOKE_PIPELINE_VIA_UI ${new Date().toISOString()}`;

// ─── Helpers ─────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[smoke] ${msg}`);
}

async function fillByTestId(page: Page, testId: string, value: string) {
  const selector = `[data-testid="${testId}"]`;
  await page.waitForSelector(selector, { timeout: 10_000 });
  await page.click(selector, { clickCount: 3 }); // select existing
  await page.type(selector, value);
}

async function clickByText(page: Page, text: string | RegExp) {
  await page.evaluate((needle) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const target = buttons.find((b) =>
      typeof needle === "string"
        ? b.textContent?.trim().toLowerCase().includes(needle.toLowerCase())
        : needle.test(b.textContent?.trim() ?? ""),
    );
    if (!target) throw new Error(`No button matching "${needle}"`);
    (target as HTMLButtonElement).click();
  }, text as any);
}

// ─── Phases ──────────────────────────────────────────────────────────

async function login(page: Page) {
  log(`Navigating to ${TARGET_URL}/login`);
  await page.goto(`${TARGET_URL}/login`, { waitUntil: "domcontentloaded" });
  await fillByTestId(page, "input-email", EMAIL);
  await fillByTestId(page, "input-password", PASS);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 20_000 }),
    page.click('[data-testid="button-login"]'),
  ]);
  log(`Logged in as ${EMAIL} → ${page.url()}`);
}

async function submitLetter(page: Page): Promise<void> {
  log(`Navigating to ${TARGET_URL}/submit`);
  await page.goto(`${TARGET_URL}/submit`, { waitUntil: "networkidle2" });

  // Step 1: Letter type + subject
  log("Step 1: letter type = demand-letter, subject = tagged");
  const letterTypeBtn = '[data-testid="button-letter-type-demand-letter"]';
  await page.waitForSelector(letterTypeBtn, { timeout: 15_000 });
  await page.click(letterTypeBtn);
  await fillByTestId(page, "input-subject", TAG);
  await clickByText(page, /next/i);

  // Step 2: Jurisdiction = California (no easy test-id; use combobox + option)
  log("Step 2: jurisdiction = California");
  await page.waitForSelector('[role="combobox"]', { timeout: 10_000 });
  await page.click('[role="combobox"]');
  // Wait for popper, then click the CA option
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll('[role="option"]')).some((el) => /California/i.test(el.textContent ?? "")),
    { timeout: 10_000 },
  );
  await page.evaluate(() => {
    const opt = Array.from(document.querySelectorAll('[role="option"]')).find((el) =>
      /California/i.test(el.textContent ?? ""),
    );
    (opt as HTMLElement | undefined)?.click();
  });
  await clickByText(page, /next/i);

  // Step 3: Parties
  log("Step 3: parties");
  await page.waitForSelector("#senderName", { timeout: 10_000 });
  await page.type("#senderName", "Smoke Sender");
  await fillByTestId(page, "input-senderAddress", "123 Smoke Ave, Los Angeles, CA 90001");
  await page.type("#recipientName", "Smoke Recipient");
  await fillByTestId(page, "input-recipientAddress", "456 Target Blvd, San Francisco, CA 94102");
  await clickByText(page, /next/i);

  // Step 4: Details
  log("Step 4: incident description");
  await fillByTestId(
    page,
    "input-description",
    "Headless Puppeteer smoke run — landlord retained $2,400 of a $3,000 security deposit without itemized statement, 60+ days post move-out.",
  );
  await clickByText(page, /next/i);

  // Step 5: Outcome
  log("Step 5: desired outcome");
  await page.waitForSelector("#desiredOutcome", { timeout: 10_000 });
  await page.type("#desiredOutcome", "Full refund of $2,400 plus statutory damages.");
  await clickByText(page, /next/i);

  // Step 6: Exhibits → just submit
  log("Step 6: submit");
  await page.waitForTimeout?.(500); // older Puppeteer
  await new Promise((r) => setTimeout(r, 500));
  await clickByText(page, /submit letter/i);

  // Wait for redirect to dashboard or letter detail
  await page.waitForFunction(
    () => /\/dashboard|\/letters\//.test(window.location.pathname),
    { timeout: 30_000 },
  );
  log(`Submitted → ${page.url()}`);
}

async function pollUntilProgressed(): Promise<{ id: number; status: string; chars: number } | null> {
  const TERMINAL_OR_DRAFTING = new Set([
    "researching",
    "drafting",
    "ai_generation_completed_hidden",
    "letter_released_to_subscriber",
    "attorney_review_upsell_shown",
    "generated_locked",
    "pending_review",
    "under_review",
    "approved",
    "pipeline_failed",
  ]);

  const sql = postgres(DB_URL!);
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  try {
    while (Date.now() < deadline) {
      const rows = await sql<Array<{ id: number; status: string }>>`
        SELECT id, status FROM letter_requests
        WHERE subject = ${TAG}
        ORDER BY created_at DESC LIMIT 1
      `;
      if (rows.length > 0) {
        const { id, status } = rows[0];
        log(`Letter #${id} status: ${status}`);

        if (TERMINAL_OR_DRAFTING.has(status) && status !== "submitted" && status !== "researching") {
          // Look for ai_draft version
          const versions = await sql<Array<{ id: number; content: string }>>`
            SELECT id, content FROM letter_versions
            WHERE letter_request_id = ${id} AND version_type = 'ai_draft'
            ORDER BY created_at DESC LIMIT 1
          `;
          if (versions.length > 0) {
            return { id, status, chars: versions[0].content.length };
          }
          // status moved past drafting but no version yet → keep polling briefly
          if (status === "pipeline_failed") {
            return { id, status, chars: 0 };
          }
        }
      }
      await new Promise((r) => setTimeout(r, 4_000));
    }
    return null;
  } finally {
    await sql.end();
  }
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  log(`Target: ${TARGET_URL}`);
  log(`Subject tag: ${TAG}`);
  log(`DB: ${(DB_URL ?? "").split("@")[1] ?? "?"}`);
  log(`Poll timeout: ${POLL_TIMEOUT_MS}ms`);
  log("");

  let browser: Browser | undefined;
  try {
    browser = await puppeteer.launch({
      headless: HEADLESS as any,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(20_000);
    page.on("console", (msg) => {
      if (msg.type() === "error") log(`[browser console error] ${msg.text()}`);
    });

    await login(page);
    await submitLetter(page);
  } catch (err) {
    log(`UI flow failed: ${err instanceof Error ? err.message : String(err)}`);
    if (browser) await browser.close().catch(() => {});
    process.exit(1);
  }

  log("");
  log("UI flow done. Polling Supabase for pipeline progression…");
  const result = await pollUntilProgressed();

  if (browser) await browser.close().catch(() => {});

  if (!result) {
    log(`TIMEOUT after ${POLL_TIMEOUT_MS}ms — no letter advanced past 'researching' for subject "${TAG}"`);
    log("Possible causes: worker not running, pipeline stuck, prod backend on old code");
    process.exit(1);
  }

  log("");
  log("─".repeat(60));
  if (result.status === "pipeline_failed") {
    log(`❌ Letter #${result.id} ended in pipeline_failed`);
    log(`   This usually means the deployed backend's pipeline is broken.`);
    log(`   If the target is prod and PR #58 isn't merged, that's expected.`);
    process.exit(1);
  }
  log(`✅ Letter #${result.id} reached status "${result.status}" with ai_draft (${result.chars} chars)`);
  log(`   Subject tag for cleanup: ${TAG}`);
  log(`   To clean up:`);
  log(`     DELETE FROM letter_versions WHERE letter_request_id = ${result.id};`);
  log(`     DELETE FROM letter_requests WHERE id = ${result.id};`);
}

main().catch((err) => {
  console.error("[smoke] Unhandled error:", err);
  process.exit(1);
});
