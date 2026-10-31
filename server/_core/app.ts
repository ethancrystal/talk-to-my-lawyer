import express from "express";
import crypto from "crypto";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { Sentry } from "../sentry";
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
import {
  authRateLimitMiddleware,
  generalRateLimitMiddleware,
} from "../rateLimiter";
import { getPublicHealth, getDetailedHealth } from "../healthCheck";
import { logger } from "../logger";

/**
 * Build the Express application (middleware + API routes).
 *
 * Shared by the long-running local/dev server (`server/_core/index.ts`, which
 * adds Vite/static serving and `listen()`) and the Vercel function
 * (`api/index.ts`, where the CDN serves the static client). Keep this free of
 * side effects that assume a long-lived process (no listen, no timers).
 */
export function createApp(): express.Express {
  const app = express();
  app.disable("x-powered-by");
  // Trust the platform proxy (Vercel) so X-Forwarded-Proto/-For are honoured.
  // Required for secure cookie handling, protocol detection and rate limiting.
  app.set("trust proxy", 1);

  // ─── CORS ────────────────────────────────────────────────────────────────────
  // Allowed origins: production domains + this deployment's own Vercel URLs.
  // We deliberately do NOT allow a *.vercel.app wildcard: anyone can host a
  // page there, and these responses carry credentials.
  // Additional origins can be added via CORS_ALLOWED_ORIGINS (comma-separated env var).
  const STATIC_ALLOWED_ORIGINS = new Set([
    "https://www.talk-to-my-lawyer.com",
    "https://talk-to-my-lawyer.com",
  ]);

  // Vercel system env vars: this deployment, its branch alias and the
  // project's production domain (hostnames only, no scheme).
  for (const host of [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    if (host) STATIC_ALLOWED_ORIGINS.add(`https://${host}`);
  }

  // Extra origins from env (e.g. other preview URLs)
  const extraOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);
  for (const o of extraOrigins) STATIC_ALLOWED_ORIGINS.add(o);

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isDev = process.env.NODE_ENV !== "production";
    const localhostOrigin =
      origin && /^https?:\/\/localhost(:\d+)?$/.test(origin);

    if (
      origin &&
      (STATIC_ALLOWED_ORIGINS.has(origin) || (isDev && localhostOrigin))
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

  // ─── Request Logging Middleware ────────────────────────────────────────────
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
  // ──────────────────────────────────────────────────────────────────────────

  // ─── Security Headers ─────────────────────────────────────────────────────
  app.use((_req, res, next) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (process.env.NODE_ENV === "production") {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains"
      );
    }
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "0");
    const isDev = process.env.NODE_ENV !== "production";
    if (!isDev) {
      res.setHeader(
        "Content-Security-Policy",
        [
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
        ].join("; ")
      );
    }
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    );
    next();
  });
  // ──────────────────────────────────────────────────────────────────────────

  // ─── X-Robots-Tag (indexability hints for crawlers & AI bots) ─────────────
  // Defense-in-depth companion to client/public/robots.txt. Some crawlers ignore
  // robots.txt, some only follow HTTP headers, and some follow internal links into
  // API paths where robots.txt never gets checked. Setting the header on every
  // response tells every well-behaved bot exactly which URLs are public and which
  // are private — in HTTP, not just as a separate text file.
  //
  //   public pages (/, /blog, /services, /pricing, /faq, /analyze, /terms, /privacy)
  //     → index, follow, max-image-preview:large
  //   auth / api / dashboard / admin / per-user routes
  //     → noindex, nofollow, noarchive
  //
  // Paths not in either list fall through to index,follow (safe default for the
  // SPA's static marketing routes).
  const PRIVATE_PATH_PREFIXES = [
    "/api/",
    "/auth/",
    "/admin",
    "/dashboard",
    "/submit",
    "/letters",
    "/attorney",
    "/review",
    "/employee",
    "/subscriber",
    "/profile",
    "/onboarding",
    "/settings",
    "/login",
    "/signup",
    "/forgot-password",
    "/verify-email",
    "/reset-password",
    "/accept-invitation",
  ];
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
  // ──────────────────────────────────────────────────────────────────────────

  // ─── Health check endpoints (plain HTTP GET, no tRPC overhead) ────────────
  // GET /health — public, used by uptime monitors and load balancers.
  // Returns overall status derived from all dependencies (DB, Redis, Stripe,
  // Resend, Anthropic, Perplexity, R2) via a background probe that runs
  // every 30s. Synchronous — no external API calls on each request.
  const healthHandler: express.RequestHandler = (_req, res) => {
    const result = getPublicHealth();
    const httpStatus = result.status === "unhealthy" ? 503 : 200;
    res.status(httpStatus).json(result);
  };
  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);

  // GET /health/details — admin-only, returns per-service breakdown
  // with response times. Background probe refreshes every 30s.
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
  // ──────────────────────────────────────────────────────────────────────────

  // ⚠️ Stripe webhook MUST be registered BEFORE express.json() to get raw body
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhookHandler
  );
  // Body parser — 12 MB cap: 7.5 MB actual file base64-encodes to ~10 MB, plus JSON envelope overhead
  app.use(express.json({ limit: "12mb" }));
  app.use(express.text({ limit: "12mb", type: ["text/markdown", "text/plain"] }));
  app.use(express.urlencoded({ limit: "12mb", extended: true }));

  // ─── Rate Limiting ──────────────────────────────────────────────────────────
  app.use("/api/auth/login", authRateLimitMiddleware);
  app.use("/api/auth/signup", authRateLimitMiddleware);
  app.use("/api/auth/forgot-password", authRateLimitMiddleware);
  app.use("/api/trpc", generalRateLimitMiddleware);
  // ───────────────────────────────────────────────────────────────────────────

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

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  registerSentryDebugRoute(app);

  // ─── Sentry Express error handler (must be before other error handlers) ───
  Sentry.setupExpressErrorHandler(app);
  return app;
}
