/**
 * Vercel-only deployment guards.
 *
 *  - /api/internal/* triggers fail closed and authenticate with CRON_SECRET
 *  - vercel.json, the GitHub Actions scheduler and the job registry stay in sync
 *  - the superseded deployment methods (Railway, Cloudflare, Docker, k8s, Replit) are gone
 *  - the serverless queue kick is a no-op outside Vercel
 */

import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";

const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf-8");

// ─── Registry parsed from source (avoids importing the whole server graph) ──
function readRegistry(): Array<{ name: string; schedule: string }> {
  const src = read("server/cronScheduler.ts");
  const out: Array<{ name: string; schedule: string }> = [];
  const re = /name: "([a-z-]+)",\s*schedule: "([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push({ name: m[1], schedule: m[2] });
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// cronAuth + routes
// ═══════════════════════════════════════════════════════════════════════════

const runCronJob = vi.fn();
const drainPipelineQueue = vi.fn();

vi.mock("./cronScheduler", () => ({
  CRON_JOBS: [{ name: "draft-reminders", schedule: "0 * * * *", run: vi.fn() }],
  getCronJob: (name: string) =>
    name === "draft-reminders"
      ? { name, schedule: "0 * * * *", run: vi.fn() }
      : undefined,
  runCronJob: (...a: unknown[]) => runCronJob(...a),
}));
vi.mock("./queueDrain", () => ({
  drainPipelineQueue: (...a: unknown[]) => drainPipelineQueue(...a),
}));
vi.mock("./logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe("/api/internal cron + drain routes", () => {
  let server: http.Server;
  let base = "";
  const originalSecret = process.env.CRON_SECRET;

  beforeAll(async () => {
    const { registerCronRoutes } = await import("./cronRoutes");
    const app = express();
    registerCronRoutes(app);
    server = http.createServer(app);
    await new Promise<void>(r => server.listen(0, r));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });

  afterAll(async () => {
    await new Promise<void>(r => server.close(() => r()));
  });

  beforeEach(() => {
    runCronJob.mockReset().mockResolvedValue({ job: "draft-reminders", ok: true, elapsedMs: 1 });
    drainPipelineQueue.mockReset().mockResolvedValue({ processed: 1, failed: 0, elapsedMs: 5 });
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("fails closed (503) when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await fetch(`${base}/api/internal/cron/draft-reminders`, { method: "POST" });
    expect(res.status).toBe(503);
    expect(runCronJob).not.toHaveBeenCalled();
  });

  it("rejects a missing or wrong bearer token (401)", async () => {
    process.env.CRON_SECRET = "s3cret";
    const none = await fetch(`${base}/api/internal/cron/draft-reminders`, { method: "POST" });
    const wrong = await fetch(`${base}/api/internal/cron/draft-reminders`, {
      method: "POST",
      headers: { authorization: "Bearer nope" },
    });
    expect(none.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(runCronJob).not.toHaveBeenCalled();
  });

  it("runs a job for GET (Vercel Cron) and POST (GitHub Actions) with the right token", async () => {
    process.env.CRON_SECRET = "s3cret";
    for (const method of ["GET", "POST"]) {
      const res = await fetch(`${base}/api/internal/cron/draft-reminders`, {
        method,
        headers: { authorization: "Bearer s3cret" },
      });
      expect(res.status).toBe(200);
    }
    expect(runCronJob).toHaveBeenCalledTimes(2);
  });

  it("returns 500 when the job reports failure and 404 for unknown jobs", async () => {
    process.env.CRON_SECRET = "s3cret";
    runCronJob.mockResolvedValueOnce({ job: "draft-reminders", ok: false, elapsedMs: 1, error: "boom" });
    const failed = await fetch(`${base}/api/internal/cron/draft-reminders`, {
      method: "POST",
      headers: { authorization: "Bearer s3cret" },
    });
    expect(failed.status).toBe(500);
    const unknown = await fetch(`${base}/api/internal/cron/nope`, {
      method: "POST",
      headers: { authorization: "Bearer s3cret" },
    });
    expect(unknown.status).toBe(404);
  });

  it("drain endpoint is authenticated and returns the drain result", async () => {
    process.env.CRON_SECRET = "s3cret";
    const denied = await fetch(`${base}/api/internal/queue/drain`, { method: "POST" });
    expect(denied.status).toBe(401);
    expect(drainPipelineQueue).not.toHaveBeenCalled();

    const ok = await fetch(`${base}/api/internal/queue/drain`, {
      method: "POST",
      headers: { authorization: "Bearer s3cret" },
    });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true, processed: 1 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Config consistency
// ═══════════════════════════════════════════════════════════════════════════

describe("vercel.json", () => {
  const cfg = JSON.parse(read("vercel.json"));
  const registry = readRegistry();

  it("registry parsing found all 11 jobs", () => {
    expect(registry).toHaveLength(11);
  });

  it("serves the static client from dist/public and routes API traffic to the function", () => {
    expect(cfg.outputDirectory).toBe("dist/public");
    const sources = cfg.rewrites.map((r: { source: string }) => r.source);
    expect(sources).toContain("/api/:path*");
    // SPA fallback must come last so it never shadows the API rewrite
    expect(sources[sources.length - 1]).toBe("/(.*)");
    expect(fs.existsSync(path.join(ROOT, "api/index.ts"))).toBe(true);
  });

  it("only schedules Vercel Cron once a day (Hobby limit) against known endpoints", () => {
    const jobNames = new Set(registry.map(j => j.name));
    for (const c of cfg.crons) {
      const [min, hour, dom, mon, dow] = c.schedule.split(" ");
      expect(/^\d+$/.test(min) && /^\d+$/.test(hour)).toBe(true);
      expect([dom, mon, dow]).toEqual(["*", "*", "*"]);
      const m = /^\/api\/internal\/cron\/(.+)$/.exec(c.path);
      if (m) expect(jobNames.has(m[1])).toBe(true);
      else expect(c.path).toBe("/api/internal/queue/drain");
    }
  });

  it("allows long-running pipeline functions up to the Hobby maximum", () => {
    expect(cfg.functions["api/index.ts"].maxDuration).toBe(300);
  });
});

describe("GitHub Actions scheduler parity", () => {
  const registry = readRegistry();
  const script = read("scripts/trigger-cron.sh");
  const workflow = read(".github/workflows/cron.yml");

  it("workflow schedules every distinct registry schedule", () => {
    for (const schedule of new Set(registry.map(j => j.schedule))) {
      expect(workflow).toContain(`- cron: "${schedule}"`);
    }
  });

  it("trigger script maps each schedule to exactly its registry jobs", () => {
    const bySchedule = new Map<string, string[]>();
    for (const j of registry) bySchedule.set(j.schedule, [...(bySchedule.get(j.schedule) ?? []), j.name]);
    for (const [schedule, names] of bySchedule) {
      const line = script.split("\n").find(l => l.includes(`"${schedule}")`));
      expect(line, `no case for "${schedule}"`).toBeTruthy();
      const jobs = /JOBS="([^"]*)"/.exec(line!)![1].split(" ").filter(j => j !== "drain");
      expect(jobs.sort()).toEqual([...names].sort());
    }
  });

  it("drains the queue on the 5-minute tick", () => {
    const line = script.split("\n").find(l => l.includes('"*/5 * * * *")'))!;
    expect(line).toContain("drain");
  });
});

describe("superseded deployment methods are removed", () => {
  const gone = [
    "Dockerfile",
    "Dockerfile.dev",
    "docker-compose.yml",
    "docker-compose.prod.yml",
    "docker-entrypoint.sh",
    ".dockerignore",
    "railway.toml",
    ".railwayignore",
    "wrangler.jsonc",
    "cloudflare",
    "k8s",
    ".replit",
    "replit.nix",
    "replit.md",
  ];
  for (const f of gone) {
    it(`${f} no longer exists`, () => {
      expect(fs.existsSync(path.join(ROOT, f))).toBe(false);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Queue kick
// ═══════════════════════════════════════════════════════════════════════════

describe("kickQueueDrain", () => {
  it("does nothing outside Vercel (the long-running worker owns the queue)", async () => {
    const prev = process.env.VERCEL;
    delete process.env.VERCEL;
    vi.resetModules();
    vi.doUnmock("./queueDrain");
    vi.doMock("./queue", () => ({
      getBoss: vi.fn(),
      isQueueConnectionConfigured: vi.fn(() => true),
      QUEUE_NAME: "q",
    }));
    vi.doMock("./worker", () => ({ processJob: vi.fn() }));
    vi.doMock("./sentry", () => ({ captureServerException: vi.fn() }));
    const { kickQueueDrain } = await import("./queueDrain");
    const queue = await import("./queue");
    kickQueueDrain();
    expect(queue.getBoss).not.toHaveBeenCalled();
    if (prev !== undefined) process.env.VERCEL = prev;
  });
});
