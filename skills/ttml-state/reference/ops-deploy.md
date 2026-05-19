# Ops And Deploy - Current State

> **Last verified:** 2026-05-17 against `package.json`, `server/_core/vite.ts`, `server/_core/prerenderCache.ts`, `scripts/prerender.ts`, `Dockerfile` / `docker-compose.yml` / `docker-entrypoint.sh` (referenced), `AGENTS.md`, and `docs/PRODUCTION_RUNBOOK.md` (referenced).

One Docker image, three Railway services, one Postgres on Supabase, one Redis on Upstash for rate limiting, and pg-boss jobs in Postgres. Build is split into the Vite client, four esbuild server bundles, and a best-effort prerender pass for static public pages.

---

## 1. Build Pipeline

`pnpm build` runs these passes in sequence:

```
vite build                                                    -> dist/public/
esbuild server/_core/index.ts   --outdir=dist                -> dist/index.js
esbuild server/instrument.ts    --outdir=dist                -> dist/instrument.js
esbuild server/migrate.ts       --outdir=dist                -> dist/migrate.js
esbuild server/worker.ts        --outdir=dist                -> dist/worker.js
tsx scripts/prerender.ts                                      -> dist/_prerender/
```

All esbuild bundles target Node, use ESM, bundle dependencies, and externalize `@tailwindcss/vite`, `@vitejs/plugin-react`, and `vite`.

Pre-deploy validation gate: `pnpm check` -> `pnpm test` -> `pnpm build`.

---

## 2. Public Prerendering

- `scripts/prerender.ts` runs after the app build. It starts a temporary Express static server, opens each data-free public route with Puppeteer, waits for React/Helmet to settle, and writes full HTML to `dist/_prerender/`.
- Routes currently prerendered: `/`, `/pricing`, `/faq`, `/terms`, `/privacy`, `/analyze`, `/services`, plus each `/services/<slug>` from `shared/serviceSlugs.ts`.
- Blog routes are intentionally not Puppeteer-prerendered because they require DB-backed content. They use `server/spaRoutes.ts` fallback HTML from published post content.
- If Chromium cannot launch, the script logs a warning and exits 0 after clearing stale output. The production server then falls back to SEO-injected SPA HTML.
- Per-route prerender failures after Chromium launches fail the build.
- Production loads `dist/_prerender/` at startup via `server/_core/prerenderCache.ts`. `server/_core/vite.ts` serves cached prerendered HTML first and sets `X-Prerender: 1`.

---

## 3. Docker Entrypoint

`docker-entrypoint.sh` dispatches on `PROCESS_TYPE`:

| `PROCESS_TYPE` | Command                                             | Role                                                    |
| -------------- | --------------------------------------------------- | ------------------------------------------------------- |
| `web`          | `node --import ./dist/instrument.js dist/index.js`  | Express + tRPC + static client. Health at `/api/health` |
| `worker`       | `node --import ./dist/instrument.js dist/worker.js` | pg-boss pipeline job consumer                           |
| `migrate`      | `node dist/migrate.js`                              | Drizzle migration runner                                |
| `all`          | migrate -> background worker -> web                 | Legacy single-container convenience                     |

`dns.setDefaultResultOrder("ipv4first")` is set at web/worker boot and via production Node flags to avoid Railway/Supabase IPv6 pooler issues.

---

## 4. Railway Services

| Service        | `PROCESS_TYPE` | Domain                                               | Health        | Restart policy |
| -------------- | -------------- | ---------------------------------------------------- | ------------- | -------------- |
| `ttml-app`     | `web`          | `talk-to-my-lawyer.com`, `www.talk-to-my-lawyer.com` | `/api/health` | Always         |
| `ttml-worker`  | `worker`       | none                                                 | none          | Always         |
| `ttml-migrate` | `migrate`      | none                                                 | none          | Never          |

Deploy order: `ttml-migrate` first, then `ttml-app` and `ttml-worker`.

---

## 5. Static And SPA Serving

- Production serves `dist/public` through `express.static(distPath, { index: false })` so every HTML route goes through the prerender/SEO pipeline.
- Missing assets and probe-looking paths are short-circuited by `shouldReturnAsset404`.
- Known SPA routes resolve through `server/spaRoutes.ts`; unknown routes return HTTP 404 with a noindex shell.
- Private app/auth/API routes get noindex policy via `X-Robots-Tag` and injected metadata.

---

## 6. Security Middleware

Set in `server/_core/index.ts`:

| Header / config             | Behavior                                         |
| --------------------------- | ------------------------------------------------ |
| `X-Frame-Options`           | `DENY`                                           |
| `X-Content-Type-Options`    | `nosniff`                                        |
| `Strict-Transport-Security` | Production only                                  |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                |
| `Content-Security-Policy`   | Production only                                  |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=()`       |
| `X-Robots-Tag`              | Public pages indexable; private/auth/API noindex |
| Body size limit             | 12 MB JSON/urlencoded                            |

Stripe webhook raw-body middleware must stay before `express.json()`.

---

## 7. Rate Limiting

`server/rateLimiter.ts` uses Upstash Redis:

| Scope               | Limit                           | Failure mode |
| ------------------- | ------------------------------- | ------------ |
| Auth endpoints      | 10 requests / 15 min per IP     | Fail-closed  |
| tRPC general        | 60 requests / 1 min per session | Fail-open    |
| Sensitive mutations | 5 / hour                        | Fail-open    |

---

## 8. Background Jobs And Cron

- `server/worker.ts`: consumes pg-boss jobs.
- `server/cronScheduler.ts`: schedules in-process cron jobs.
- `stalePipelineLockRecovery.ts`: releases old pipeline locks.
- `staleReviewReleaser.ts`: releases stale attorney reviews.
- `freePreviewEmailCron.ts`: sends free-preview-ready emails idempotently.
- Fine-tune poller: checks Vertex AI jobs when GCP env is configured.

---

## 9. Webhook Security

- Stripe uses `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET` and `processed_stripe_events` idempotency.
- n8n callbacks use timing-safe comparison against `N8N_CALLBACK_SECRET`.
- Cloudflare Email/PDF/Affiliate workers use Bearer secrets from their corresponding env vars.

---

## 10. Logging And Monitoring

- Pino structured logger. ESLint enforces merge-object first: `logger.error({ err }, "message")`.
- Sentry server/client instrumentation via `server/instrument.ts` and `client/src/lib/sentry.ts`.
- Pipeline token usage and metrics are stored in `workflow_jobs` and surfaced in admin analytics.

---

## 11. Deploy Procedure

1. PR runs `pnpm check`, `pnpm test`, `pnpm build`.
2. Merge to `main`; Railway builds the Docker image.
3. `ttml-migrate` runs first.
4. `ttml-app` and `ttml-worker` start.
5. Web health check hits `/api/health`.
6. Smoke test the platform lifecycle; see `skills/platform-e2e-verification/SKILL.md`.

---

## 12. Specialist-Skill Cross-References

- Deployment readiness: [`skills-audit/corrected/ttml-deployment-readiness/SKILL.md`](../../../skills-audit/corrected/ttml-deployment-readiness/SKILL.md)
- Code review for production: [`skills-audit/corrected/ttml-code-review-qa/SKILL.md`](../../../skills-audit/corrected/ttml-code-review-qa/SKILL.md)
- E2E verification: [`skills/platform-e2e-verification/SKILL.md`](../../platform-e2e-verification/SKILL.md)

---

**Sources read:** `package.json`, `server/_core/vite.ts`, `server/_core/prerenderCache.ts`, `scripts/prerender.ts`, `AGENTS.md`, `CLAUDE.md`, `ARCHITECTURE.md`. Dockerfile / docker-compose / entrypoint referenced; re-verify before changing the deploy contract.
