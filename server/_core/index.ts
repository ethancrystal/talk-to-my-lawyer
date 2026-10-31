/**
 * Server entry point — standalone Express server (Railway/Docker).
 *
 * The Express app, middleware, and route registration now live in
 * appFactory.ts (createApp) so they can be shared with the Vercel
 * serverless function at api/index.ts.
 *
 * This file handles only startup-only concerns:
 *   - DB connection + startup migrations
 *   - pg-boss warmup (skipped when PIPELINE_MODE=simple)
 *   - Port resolution + server.listen()
 *   - Cron scheduler (node-cron)
 *   - R2 connectivity check
 *   - Background health probe
 */
// Import triggers: dotenv, DNS, Sentry init, process error handlers
import { createApp } from "./appFactory";
import { logger } from "../logger";
import { getDb } from "../db";
import { getBoss, isQueueConnectionConfigured } from "../queue";
import { checkR2Connectivity } from "../storage";
import { startHealthProbe } from "../healthCheck";
import { startCronScheduler } from "../cronScheduler";
import { validateRequiredEnv } from "./env";
import net from "node:net";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => {
      probe.close(() => resolve(true));
    });
    probe.listen(port, "0.0.0.0");
  });
}

async function resolveListenPort(preferredPort: number): Promise<number> {
  if (process.env.NODE_ENV === "production") return preferredPort;
  if (await isPortAvailable(preferredPort)) return preferredPort;
  for (let port = preferredPort + 1; port < preferredPort + 20; port += 1) {
    if (await isPortAvailable(port)) {
      logger.warn(
        { module: "Startup", preferredPort, fallbackPort: port },
        `[Startup] Port ${preferredPort} is in use, falling back to ${port} for development`
      );
      return port;
    }
  }
  throw new Error(`No available development port found between ${preferredPort} and ${preferredPort + 19}`);
}

async function startServer() {
  // Fail fast in production if required secrets are missing
  if (process.env.NODE_ENV === "production") {
    validateRequiredEnv();
  }

  // Create the Express app (shared factory with Vercel function)
  const { app, server } = await createApp({ validateEnv: false });
  const { createServer } = await import("http");
  const httpServer = server ?? createServer(app);

  // Run DB connection and startup migrations before accepting traffic
  const db = await getDb();
  if (!db) {
    throw new Error(
      "[Startup] Primary database is not available. Set SUPABASE_DIRECT_URL, SUPABASE_DATABASE_URL, or DATABASE_URL."
    );
  }
  logger.info({ module: "Startup" }, "[Startup] Database connection and startup migrations complete");

  // Warm up pg-boss so the first letter submission doesn't cold-start it
  // under a live HTTP request. SKIP if PIPELINE_MODE=simple.
  const useSimplePipeline = process.env.PIPELINE_MODE === "simple";
  if (useSimplePipeline) {
    logger.info({ module: "Startup" }, "[Startup] Skipping pg-boss warmup (PIPELINE_MODE=simple)");
  } else if (!isQueueConnectionConfigured()) {
    logger.info({ module: "Startup" }, "[Startup] Skipping pg-boss warmup (queue DB URL not configured)");
  } else {
    getBoss()
      .then(() => logger.info({ module: "Startup" }, "[Startup] pg-boss queue connection warmed up"))
      .catch((err) => {
        logger.error({ module: "Startup", err }, "[Startup] pg-boss warmup failed — queue will cold-start on first use");
      });
  }

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  const port = await resolveListenPort(preferredPort);

  httpServer.listen(port, () => {
    logger.info({ module: "Startup", port }, `Server running on http://localhost:${port}/`);
    // Start in-process cron scheduler (draft reminders, etc.)
    startCronScheduler();
    // Check Cloudflare R2 connectivity
    checkR2Connectivity().catch((err) => {
      logger.error({ module: "Startup", err }, "[Startup] R2 connectivity check failed");
    });
    // Start background health probe
    startHealthProbe();
  });
}

startServer().catch((err) => {
  logger.error({ module: "Fatal", err }, "[Fatal] Server failed to start");
  process.exit(1);
});
