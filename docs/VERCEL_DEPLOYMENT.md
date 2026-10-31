# Vercel Deployment

Vercel is the **only** supported production deployment. Railway, Cloudflare Workers
(proxy), Docker/Compose, Kubernetes and Replit configs were removed.

## How it fits together

| Concern | Where it runs | Config |
|---|---|---|
| React client (static) | Vercel CDN, built to `dist/public` | `vercel.json` (`outputDirectory`, SPA rewrite, security headers) |
| Express + tRPC API | One Vercel function: `api/index.ts` → `createApp()` in `server/_core/app.ts` | `vercel.json` rewrites `/api/*`, `/health`, `/sitemap.xml` to it |
| Letter pipeline (was the pg-boss worker) | Same function, started right after enqueue via `waitUntil` | `server/queueDrain.ts`, `server/queue.ts` (`kickDrain`) |
| Scheduled jobs (was `node-cron`) | HTTP triggers `/api/internal/cron/:job` and `/api/internal/queue/drain` | `server/cronScheduler.ts` (registry), `server/cronRoutes.ts` |
| Scheduler | GitHub Actions (frequent jobs) + Vercel Cron (daily backstop) | `.github/workflows/cron.yml`, `scripts/trigger-cron.sh`, `vercel.json` `crons` |
| DB migrations | Production builds only | `scripts/vercel-build.sh` |

Local development is unchanged: `pnpm dev` runs `server/_core/index.ts` (Vite + in-process
`node-cron`). `pnpm start` / `node dist/worker.js` still work for a long-running local run.

## Hobby-plan constraints (read this)

- **Functions are capped at 300 s.** A single pipeline job (research 90 s + draft 120 s +
  assembly 90 s + vetting 60 s worst case) cannot be resumed. If a run exceeds the cap the
  invocation is killed and the letter is recovered by `stale-pipeline-lock-recovery`, which
  on Vercel treats a lock older than **10 minutes** as dead and re-queues the letter. A
  pipeline that *always* needs >300 s will loop — if you see that, upgrade to Pro
  (`maxDuration` up to 800 s) or move the pipeline to a durable queue/workflow.
- **Vercel Cron is once-a-day only.** The registry's 5/15-minute and hourly jobs are
  triggered by the GitHub Actions workflow instead. GitHub schedules are best-effort and can
  be delayed or skipped, so time-sensitive behaviour should not rely on them. The daily
  Vercel Cron backstop covers the queue drain, lock recovery and the two email jobs.
- **Request bodies are capped at 4.5 MB.** The app currently accepts document uploads up to
  7.5 MB as base64 through tRPC (`server/routers`, 12 MB JSON limit in `app.ts`). Larger
  uploads will fail on Vercel until uploads go directly to R2 via presigned URLs.
- **Bundle size.** The function includes Puppeteer, `@sparticuz/chromium`, LangChain and the
  AWS/GCP SDKs against a 250 MB unzipped limit. Check the first preview deployment's build
  output and PDF generation (`clientApprove`) before promoting to production.

## One-time setup

1. **Vercel project** — import the repo. Framework preset: *Other*. `vercel.json` supplies the
   build command, output directory and function settings. Node 22.
2. **Environment variables** — every variable in `.env.example` (Production + Preview as
   appropriate), plus:
   - `CRON_SECRET` — long random string. Vercel Cron sends it automatically as
     `Authorization: Bearer …`; GitHub Actions sends the same value (below). The
     `/api/internal/*` routes return **503 if it is unset**.
   - `APP_URL` — public URL, e.g. `https://www.talk-to-my-lawyer.com`.
   - Use the Supabase **pooler** URL for `DATABASE_URL` / `SUPABASE_DATABASE_URL`. Each
     function instance opens its own pool (default 3, pg-boss 2; override with
     `DB_POOL_MAX`, `PG_BOSS_POOL_MAX`).
   - Optional: `ALLOWED_ORIGIN_HOSTS`, `CORS_ALLOWED_ORIGINS` for extra preview hosts. The
     project's own Vercel hosts are allowed automatically from Vercel system env vars; there
     is deliberately no `*.vercel.app` wildcard.
3. **GitHub repository secrets** — `APP_URL` and `CRON_SECRET` (same values as above) for
   `.github/workflows/cron.yml`. Test with *Actions → Scheduled jobs → Run workflow* and
   job `queue-backlog-alert`.
4. **Stripe webhook** — point it at `https://<domain>/api/stripe/webhook`.
5. **Domain** — add `talk-to-my-lawyer.com` / `www` to the Vercel project, then cut DNS over
   from Railway/Cloudflare. Decommission the Railway services and the Cloudflare Worker
   (`ttml-app`) only after verifying the Vercel deployment.

## Migrations

`scripts/vercel-build.sh` runs `dist/migrate.js` only when `VERCEL_ENV=production`, so
preview deployments never touch the production database. The build needs the production
`SUPABASE_DIRECT_URL`/`SUPABASE_DATABASE_URL`/`DATABASE_URL` available at build time. To run
migrations by hand: `pnpm run -s _build:migrate && node dist/migrate.js`.

## Adding or changing a scheduled job

1. Add/modify the entry in `CRON_JOBS` (`server/cronScheduler.ts`).
2. Add its schedule to the `case` table in `scripts/trigger-cron.sh` and, if it is a new
   schedule, to `.github/workflows/cron.yml`.
3. `server/vercel-deploy.test.ts` fails if these drift apart.

## Operations

- Trigger a job manually: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/internal/cron/<job>`
- Drain the queue manually: same, `POST $APP_URL/api/internal/queue/drain`
- Job names: see `CRON_JOBS` in `server/cronScheduler.ts` (an unknown name returns 404 with the list).
- Stuck letter: check `queue-backlog-alert` notifications, the drain's JSON result
  (`processed` / `failed`) and Vercel function logs for `[Drain]`.
