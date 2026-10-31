import "dotenv/config";

// Force IPv4 DNS resolution — some hosts cannot reach Supabase's
// shared pooler via IPv6 (ENETUNREACH). This must be set before any
// database connections are established.
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

// Sentry must be initialized before other imports
import { initServerSentry, Sentry, captureServerException } from "../sentry";
initServerSentry();

import { logger } from "../logger";

process.on("unhandledRejection", (reason) => {
  logger.error({ module: "Process", reason }, "[Process] Unhandled promise rejection");
  captureServerException(reason instanceof Error ? reason : new Error(String(reason)), {
    tags: { component: "process", error_type: "unhandled_rejection" },
  });
  // Flush Sentry and exit — unhandled rejections are programmer errors
  Sentry.close(2000).finally(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", (err) => {
  logger.error({ module: "Process", err }, "[Process] Uncaught exception");
  captureServerException(err, {
    tags: { component: "process", error_type: "uncaught_exception" },
  });
  // Flush Sentry before exiting so the exception is captured
  Sentry.close(2000).finally(() => {
    process.exit(1);
  });
});

import { createServer } from "http";
import net from "net";

import { createApp } from "./app";
import { startCronScheduler } from "../cronScheduler";
import { serveStatic, setupVite } from "./vite";
import { getDb } from "../db";
import { validateRequiredEnv } from "./env";
import { checkR2Connectivity } from "../storage";
import { startHealthProbe } from "../healthCheck";
import { getBoss, isQueueConnectionConfigured } from "../queue";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => {
      probe.close(() => resolve(true));
    });
    probe.listen(port, "0.0.0.0");
  });
}

async function resolveListenPort(preferredPort: number): Promise<number> {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    return preferredPort;
  }

  if (await isPortAvailable(preferredPort)) {
    return preferredPort;
  }

  for (let port = preferredPort + 1; port < preferredPort + 20; port += 1) {
    if (await isPortAvailable(port)) {
      logger.warn(
        { module: "Startup", preferredPort, fallbackPort: port },
        `[Startup] Port ${preferredPort} is in use, falling back to ${port} for development`
      );
      return port;
    }
  }

  throw new Error(
    `No available development port found between ${preferredPort} and ${preferredPort + 19}`
  );
}

async function startServer() {
  // Fail fast in production if required secrets are missing
  if (process.env.NODE_ENV === "production") {
    validateRequiredEnv();
  }
  // Warn early if supabaseAnonKey is missing — an empty key causes the PKCE
  // token exchange in GET /api/auth/callback to fail with a 500, surfacing as
  // "A server error interrupted Google sign-in" on the client.
  // VITE_SUPABASE_ANON_KEY is a Vite build-time var baked into the frontend
  // bundle; it is NOT available as a server runtime env var unless also set un-prefixed.
  // The canonical server-side var is SUPABASE_ANON_KEY.
  const _anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "";
  if (!_anonKey) {
    logger.warn(
      { module: "Startup" },
      "[Startup] SUPABASE_ANON_KEY is not set. Google OAuth PKCE token exchange will fail. " +
      "Set SUPABASE_ANON_KEY in the Vercel project environment variables."
    );
  }

  const app = createApp();
  const server = createServer(app);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  const port = await resolveListenPort(preferredPort);

  // Run DB connection and startup migrations before accepting traffic.
  // If migrations fail fatally the thrown error propagates through startServer()
  // which is caught by the top-level .catch(console.error) — the process exits
  // and the server never starts listening.
  const db = await getDb();
  if (!db) {
    throw new Error(
      "[Startup] Primary database is not available. Set SUPABASE_DIRECT_URL, SUPABASE_DATABASE_URL, or DATABASE_URL."
    );
  }
  logger.info({ module: "Startup" }, "[Startup] Database connection and startup migrations complete");

  // Warm up pg-boss so the first letter submission doesn't cold-start it
  // under a live HTTP request (which can time out). Non-fatal — if it fails,
  // the queue will cold-start on first use and the error is already logged.
  //
  // SKIP if PIPELINE_MODE=simple (we don't need pg-boss for inline pipeline execution)
  const useSimplePipeline = process.env.PIPELINE_MODE === "simple";
  if (useSimplePipeline) {
    logger.info({ module: "Startup" }, "[Startup] Skipping pg-boss warmup (PIPELINE_MODE=simple)");
  } else if (!isQueueConnectionConfigured()) {
    logger.info(
      { module: "Startup" },
      "[Startup] Skipping pg-boss warmup (queue DB URL not configured)"
    );
  } else {
    getBoss().then(() => {
      logger.info({ module: "Startup" }, "[Startup] pg-boss queue connection warmed up");
    }).catch((err) => {
      logger.error({ module: "Startup", err }, "[Startup] pg-boss warmup failed — queue will cold-start on first use");
      captureServerException(err, { tags: { component: "startup", error_type: "pgboss_warmup_failed" } });
    });
  }

  server.listen(port, () => {
    logger.info({ module: "Startup", port }, `Server running on http://localhost:${port}/`);
    // Start in-process cron scheduler (draft reminders, etc.)
    startCronScheduler();
    // Check Cloudflare R2 connectivity
    checkR2Connectivity().catch((err) => {
      logger.error({ module: "Startup", err }, "[Startup] R2 connectivity check failed");
      captureServerException(err, { tags: { component: "startup", error_type: "r2_connectivity_failed" } });
    });
    // Start background health probe (checks all dependencies every 30s)
    startHealthProbe();
  });
}

startServer().catch((err) => {
  logger.error({ module: "Fatal", err }, "[Fatal] Server failed to start");
  process.exit(1);
});
