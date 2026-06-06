import { expect } from "@playwright/test";
import { test, isSubscriberConfigured } from "./fixtures/auth";
import postgres from "postgres";

test.describe("E2E Pipeline Integration Test", () => {
  test.beforeEach(() => {
    // Skip bypassed for manual testing
  });

  test("runs the AI pipeline after successful intake form submission", async ({ subscriberPage: page }) => {
    test.setTimeout(300000); // Full LangGraph run can include a quality retry.

    // 1. Submit the Letter via UI
    await page.goto("/submit");
    await page.waitForLoadState("networkidle");

    // Step 1: Letter Type — click a letter type card and fill subject
    const letterTypeBtn = page.getByTestId("button-letter-type-demand-letter");
    await expect(letterTypeBtn).toBeVisible({ timeout: 10000 });
    await letterTypeBtn.click();

    const uniqueTestSubject = `E2E Pipeline Run ${Date.now()}`;
    await page.getByTestId("input-subject").fill(uniqueTestSubject);
    await page.getByRole("button", { name: /next/i }).click();

    // Step 2: Jurisdiction — shadcn Select (Radix combobox)
    await expect(page.getByText(/State \/ Jurisdiction/i)).toBeVisible({ timeout: 5000 });
    // Click the Select trigger to open the dropdown
    const jurisdictionTrigger = page.getByRole("combobox").first();
    await jurisdictionTrigger.click();
    // Click the California option in the portal
    await page.getByRole("option", { name: /California/i }).click();
    await page.getByRole("button", { name: /next/i }).click();

    // Step 3: Parties — use IDs matching the actual form inputs
    await expect(page.locator("#senderName")).toBeVisible({ timeout: 5000 });
    await page.locator("#senderName").fill("Test Sender");
    await page.getByTestId("input-senderAddress").fill("123 Test Ave, Los Angeles, CA 90001");
    await page.locator("#recipientName").fill("Test Recipient");
    await page.getByTestId("input-recipientAddress").fill("456 Target Blvd, San Francisco, CA 94102");
    await page.getByRole("button", { name: /next/i }).click();

    // Step 4: Details — textarea with data-testid
    const description = page.getByTestId("input-description");
    await expect(description).toBeVisible({ timeout: 5000 });
    await description.fill("E2E Test scenario describing the incident in detail for the demand letter pipeline test run.");
    await page.getByRole("button", { name: /next/i }).click();

    // Step 5: Outcome — textarea with id="desiredOutcome"
    const desiredOutcome = page.locator("#desiredOutcome");
    await expect(desiredOutcome).toBeVisible({ timeout: 5000 });
    await desiredOutcome.fill("To resolve the E2E test successfully by receiving $1000 in damages.");
    await page.getByRole("button", { name: /next/i }).click();

    // Step 6: Exhibits — skip adding exhibits, just submit
    await page.waitForTimeout(500);
    const submitButton = page.getByRole("button", { name: /submit letter/i });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // Submission intentionally stays on /submit and opens a progress modal.
    await expect(
      page.getByRole("heading", { name: /preparing your letter/i })
    ).toBeVisible({ timeout: 30000 });

    // To verify in DB, create a Postgres connection
    expect(process.env.DATABASE_URL, "DATABASE_URL environment variable must be provided").toBeDefined();

    const sql = postgres(process.env.DATABASE_URL!);

    try {
      // 2. Poll DB until the pipeline persists a completed AI draft.
      let foundRecord: any;
      let foundVersion: any;

      for (let i = 0; i < 80; i++) {
        await page.waitForTimeout(3000);

        const records = await sql`
          SELECT id, status, subject, intake_json
          FROM letter_requests 
          WHERE subject = ${uniqueTestSubject}
          ORDER BY created_at DESC LIMIT 1;
        `;

        if (records.length > 0) {
          foundRecord = records[0];
          const versions = await sql`
            SELECT id, version_type, content
            FROM letter_versions
            WHERE letter_request_id = ${foundRecord.id}
              AND version_type = 'ai_draft'
            ORDER BY created_at DESC
            LIMIT 1;
          `;

          if (
            foundRecord.status === "ai_generation_completed_hidden" &&
            versions.length > 0 &&
            versions[0].content?.length > 0
          ) {
            foundVersion = versions[0];
            break;
          }
        }
      }

      // Assertions
      expect(foundRecord).toBeDefined();
      expect(foundRecord.intake_json).toBeTruthy();
      expect(foundRecord.status).toBe("ai_generation_completed_hidden");
      expect(foundVersion).toBeDefined();
      expect(foundVersion.version_type).toBe("ai_draft");
      expect(foundVersion.content.length).toBeGreaterThan(0);

    } finally {
      await sql.end();
    }
  });
});
