/**
 * Vercel serverless function entry point.
 *
 * Wraps the shared Express app factory (server/_core/appFactory.ts) so the
 * same middleware, routes, and tRPC configuration serve both Railway (standalone
 * server) and Vercel (serverless function).
 *
 * Vercel sets VERCEL=1 in the environment for all serverless functions.
 * When VERCEL is set, the submit flow runs the pipeline inline instead of
 * enqueuing to pg-boss (see server/services/canonicalProcedures.ts).
 *
 * Build: `pnpm build` produces dist/public/ (Vite client build) and
 *        dist/ (esbuild server bundles). Vercel runs this build step
 *        automatically before compiling api/index.ts.
 */
import { createApp } from "../server/_core/appFactory";
import express from "express";
import path from "node:path";
import fs from "node:fs";

// Ensure production mode — we never want Vite dev server in a serverless function
process.env.NODE_ENV = "production";

// Create the Express app (shared with server/_core/index.ts)
const { app } = await createApp({ vercel: true, validateEnv: false });

// ─── Static file serving ─────────────────────────────────────────────
// On Vercel, dist/public/ is produced by the build step. The function
// serves these directly via express.static(), falling back to index.html
// for SPA routes.
const staticDir = path.resolve(process.cwd(), "dist/public");

if (fs.existsSync(staticDir)) {
  // Serve static assets (JS, CSS, images, fonts) with caching
  app.use(
    express.static(staticDir, {
      index: false, // don't auto-serve index.html — we handle SPA fallback below
      maxAge: "1h",
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "public, s-maxage=0, must-revalidate");
        }
      },
    })
  );

  // SPA fallback — serve index.html for non-API routes
  // (SEO-injected index.html would need server-side rendering; for the test
  //  deploy we serve the raw Vite-built shell)
  app.use("*" as any, (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const url = req.path || req.url || "";

    // Don't SPA-fallback for API, health, auth, or file requests
    if (
      url.startsWith("/api/") ||
      url.startsWith("/health") ||
      url.startsWith("/auth/") ||
      url.includes(".") // static asset (favicon, robots.txt, etc.)
    ) {
      return next();
    }

    const indexPath = path.join(staticDir, "index.html");
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, "utf-8");
      res.status(200).setHeader("Content-Type", "text/html").send(html);
    } else {
      next();
    }
  });
} else {
  // Static dir not found — likely a cold start before build completed
  // or environment without dist/public/. Log and continue with API only.
  const { logger } = await import("../server/logger");
  logger.warn(
    { module: "Vercel", staticDir },
    "[Vercel] dist/public/ not found — static file serving disabled"
  );
}

export default app;
