/**
 * Express app factory — creates and configures the Express application
 * with all middleware, routes, and tRPC middleware.
 *
 * Shared between:
 *   - server/_core/index.ts (standalone server on Railway/Docker)
 *   - api/index.ts (Vercel serverless function)
 *
 * The caller is responsible for startup-only concerns: server.listen(),
 * cron scheduler, pg-boss warmup, health probe, R2 connectivity check.
 */
import "dotenv/config";

// Force IPv4 DNS resolution — Railway's network cannot reach Supabase's
// shared pooler via IPv6 (ENETUNREACH). Must be set before DB connections.
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
  Sentry.close(2000).finally(() => { process.exit(1); });
});

process.on("uncaughtException", (err) => {
  logger.error({ module: "Process", err }, "[Process] Uncaught exception");
  captureServerException(err, {
    tags: { component: "process", error_type: "uncaught_exception" },
  });
  Sentry.close(2000).finally(() => { process.exit(1); });
});

import express, { type Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { registerSupabaseAuthRoutes, authenticateRequest } from "../supabaseAuth";
import { registerN8nCallbackRoute } from "../n8nCallback";
import { registerEmailPreviewRoute } from "../emailPreview";
import { registerDraftRemindersRoute } from "../draftReminders";
import { registerPaywallEmailRoute } from "../paywallEmailCron";
import { registerFreePreviewEmailRoute } from "../freePreviewEmailCron";
import { registerDraftPdfRoute } from "../draftPdfRoute";
import { registerBlogInternalRoutes } from "../blogInternalRoutes";
import { registerBlogPublishRoute } from "../blogPublishRoute";
import { registerSitemapRoute } from "../sitemapRoute";
import { registerNewsletterRoute } from "../newsletterRoute";
import { registerConfigRoute } from "../configRoute";
import { registerClientPortalRoute } from "../clientPortalRoute";
import { registerSentryDebugRoute } from "../sentryDebugRoute";
import { registerCronRoutes } from "../cronRoutes";
import { stripeWebhookHandler } from "../stripeWebhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./vite";
import {
  authRateLimitMiddleware,
  generalRateLimitMiddleware,
} from "../rateLimiter";
import { getPublicHealth, getDetailedHealth } from "../healthCheck";
import { validateRequiredEnv } from "./env";

export interface CreateAppOptions {
  /** Whether running in a Vercel serverless function. */
  vercel?: boolean;
  /** Whether to validate required env vars at startup (production only). */
  validateEnv?: boolean;
}

/** Result of createApp — app and optionally the HTTP server (dev mode). */
export interface AppInstance {
  app: Express;
  /** HTTP server, only created in development mode for Vite HMR. */
  server?: Server;
}

// ─── CORS allowed origins ──────────────────────────────────────────────────
const STATIC_ALLOWED_ORIGINS = new Set([
  "https://www.talk-to-my-lawyer.com",
  "https://talk-to-my-lawyer.com",
]);

function getAllowedOrigins(): Set<string> {
  const origins = new Set(STATIC_ALLOWED_ORIGINS);
  const extraOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  for (const o of extraOrigins) origins.add(o);
  const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;
  if (replitDevDomain) origins.add(`https://${replitDevDomain}`);
  // This deployment's own Vercel hostnames (system env vars set by Vercel).
  // Same-origin requests don't need CORS, but listing them keeps credentialed
  // calls working across the deployment / branch / production aliases. Never a
  // *.vercel.app wildcard: any Vercel user could host a page there.
  for (const host of [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    if (host) origins.add(`https://${host}`);
  }
  return origins;
}

// ─── Private paths for X-Robots-Tag ────────────────────────────────────────
const PRIVATE_PATH_PREFIXES = [
  "/api/", "/auth/", "/admin", "/dashboard", "/submit", "/letters",
  "/attorney", "/review", "/employee", "/subscriber", "/profile",
  "/onboarding", "/settings", "/login", "/signup", "/forgot-password",
  "/verify-email", "/reset-password", "/accept-invitation",
];

/**
 * Create and configure the Express application with all middleware,
 * routes, and tRPC middleware.
 *
 * @param opts.vercel — When true, skips Vite dev server setup and uses
 *   production static serving. The caller (Vercel) handles HTTP serving.
 */
export async function createApp(opts: CreateAppOptions = {}): Promise<AppInstance> {
  const { vercel = false } = opts;
  const isDev = process.env.NODE_ENV !== "production";

  // Fail fast in production if required secrets are missing
  if (process.env.NODE_ENV === "production" && opts.validateEnv) {
    validateRequiredEnv();
  }

  // Warn early if supabaseAnonKey is missing
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if (!anonKey) {
    logger.warn(
      { module: "Startup" },
      "[Startup] SUPABASE_ANON_KEY is not set. Google OAuth PKCE token exchange will fail."
    );
  }

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  // ─── CORS ────────────────────────────────────────────────────────────────────
  const allowedOrigins = getAllowedOrigins();
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const localhostOrigin =
      !!origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    // Allow any *.railway.app origin (Railway preview deployments)
    const railwayOrigin =
      !!origin && /^https:\/\/[a-z0-9-]+\.railway\.app$/.test(origin);
    // Allow any *.replit.dev origin (Replit preview deployments)
    const replitOrigin =
      !!origin && /^https:\/\/[a-z0-9-]+\.replit\.dev$/.test(origin);

    if (
      origin &&
      (allowedOrigins.has(origin) ||
        (isDev && localhostOrigin) ||
        railwayOrigin ||
        (isDev && replitOrigin))
    ) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Client-Info, Apikey, x-trpc-source"
    );
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // ─── Request Logging ───────────────────────────────────────────────────────
  app.use((req, res, next) => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    const reqLogger = logger.child({ module: "HTTP", requestId, method: req.method, url: req.url });
    (req as any).log = reqLogger;
    (req as any).requestId = requestId;
    res.on("finish", () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      reqLogger[level]({ statusCode: res.statusCode, duration }, `${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    });
    next();
  });

  // ─── Security Headers ──────────────────────────────────────────────────────
  app.use((_req, res, next) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (!isDev) {
      res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
    }
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "0");
    if (!isDev) {
      res.setHeader("Content-Security-Policy", [
        "default-src 'self'",
        "script-src 'self' https://js.stripe.com https://static.cloudflareinsights.com https://maps.googleapis.com https://maps.gstatic.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.googleapis.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://maps.googleapis.com https://places.googleapis.com",
        "frame-src https://js.stripe.com https://hooks.stripe.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "));
    }
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  // ─── X-Robots-Tag ───────────────────────────────────────────────────────────
  app.use((req, res, next) => {
    const path = req.path || req.url || "";
    const isPrivate = PRIVATE_PATH_PREFIXES.some((p) => path === p || path.startsWith(p));
    if (isPrivate) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    } else {
      res.setHeader("X-Robots-Tag", "index, follow, max-image-preview:large");
    }
    next();
  });

  // ─── Health check endpoints ────────────────────────────────────────────────
  const healthHandler: express.RequestHandler = (_req, res) => {
    const result = getPublicHealth();
    const httpStatus = result.status === "unhealthy" ? 503 : 200;
    res.status(httpStatus).json(result);
  };
  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);

  const healthDetailsHandler: express.RequestHandler = async (req, res) => {
    try {
      const user = await authenticateRequest(req);
      if (!user || user.role !== "admin") {
        res.status(user ? 403 : 401).json({ error: "Admin authentication required" });
        return;
      }
    } catch {
      res.status(401).json({ error: "Admin authentication required" });
      return;
    }
    const result = await getDetailedHealth();
    const httpStatus = result.status === "unhealthy" ? 503 : 200;
    res.status(httpStatus).json(result);
  };
  app.get("/health/details", healthDetailsHandler);
  app.get("/api/health/details", healthDetailsHandler);

  // ⚠️ Stripe webhook MUST be registered BEFORE express.json() for raw body
  app.post("/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhookHandler
  );

  // ─── Body parser — 12 MB cap ───────────────────────────────────────────────
  app.use(express.json({ limit: "12mb" }));
  app.use(express.text({ limit: "12mb", type: ["text/markdown", "text/plain"] }));
  app.use(express.urlencoded({ limit: "12mb", extended: true }));

  // ─── Rate Limiting ──────────────────────────────────────────────────────────
  app.use("/api/auth/login", authRateLimitMiddleware);
  app.use("/api/auth/signup", authRateLimitMiddleware);
  app.use("/api/auth/forgot-password", authRateLimitMiddleware);
  app.use("/api/trpc", generalRateLimitMiddleware);

  // ─── Route Registration ────────────────────────────────────────────────────
  registerSupabaseAuthRoutes(app);
  registerN8nCallbackRoute(app);
  registerEmailPreviewRoute(app);
  registerDraftRemindersRoute(app);
  registerPaywallEmailRoute(app);
  registerFreePreviewEmailRoute(app);
  registerDraftPdfRoute(app);
  registerBlogInternalRoutes(app);
  registerBlogPublishRoute(app);
  registerSitemapRoute(app);
  registerNewsletterRoute(app);
  registerConfigRoute(app);
  registerClientPortalRoute(app);
  registerCronRoutes(app);

  // ─── tRPC ───────────────────────────────────────────────────────────────────
  app.use("/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );

  registerSentryDebugRoute(app);

  // ─── Sentry Express error handler ──────────────────────────────────────────
  Sentry.setupExpressErrorHandler(app);

  // ─── Static serving ────────────────────────────────────────────────────────
  if (isDev) {
    // Dev mode: Vite dev server with HMR
    const server = createServer(app);
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
    return { app, server };
  } else {
    // Production: serve static files from dist/public/ with prerender cache
    if (vercel) {
      // On Vercel, static files are served by Vercel's edge network.
      // The app only needs to handle API routes. For SPA fallback,
      // Vercel serves index.html from the static output.
      // We add a simple catch-all that logs (actual static serving is
      // handled by vercel.json routes).
      logger.info({ module: "Vercel" }, "[Vercel] Static file serving handled by Vercel edge network");
    } else {
      serveStatic(app);
    }
    return { app };
  }
}
