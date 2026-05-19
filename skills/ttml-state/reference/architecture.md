# Architecture — Current State

> **Last verified:** 2026-05-17 against `package.json`, `tsconfig.json`, `vite.config.ts`, top-level directory tree, `server/spaRoutes.ts`, `server/_core/prerenderCache.ts`, and `scripts/prerender.ts`.

TTML is a single TypeScript monorepo. One React 19 SPA frontend (Vite 8), one Express 4 + tRPC 11 backend, one PostgreSQL database on Supabase, one pg-boss queue, deployed to Railway as three Node services (web, worker, migrate) from one Docker image.

---

## Tech stack

| Layer              | Technology                                                                                                                                                                                                                                                                         | Version (from `package.json`)                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Frontend framework | React                                                                                                                                                                                                                                                                              | `^19.2.5`                                                                                                               |
| Build tool         | Vite                                                                                                                                                                                                                                                                               | `^8.0.10`                                                                                                               |
| Language           | TypeScript                                                                                                                                                                                                                                                                         | `5.9.3` (target `ESNext`, `moduleResolution: bundler`, `strict: true`, `allowImportingTsExtensions: true`)              |
| CSS                | Tailwind CSS v4 (OKLCH theme)                                                                                                                                                                                                                                                      | `^4.2.4`, plugin `@tailwindcss/vite`, `@tailwindcss/typography`, `tw-animate-css`                                       |
| UI primitives      | shadcn/ui on Radix UI                                                                                                                                                                                                                                                              | accordion, alert-dialog, avatar, dialog, dropdown-menu, label, progress, select, separator, slot, switch, tabs, tooltip |
| Routing            | wouter                                                                                                                                                                                                                                                                             | `3.7.1` (patched — see `patches/wouter@3.7.1.patch`)                                                                    |
| Data fetching      | TanStack Query v5                                                                                                                                                                                                                                                                  | `@tanstack/react-query ^5.96.1` (object form only — no positional `useQuery(['key'])`)                                  |
| Rich text          | Tiptap 3                                                                                                                                                                                                                                                                           | `@tiptap/react`, `@tiptap/starter-kit`, plus highlight / placeholder / text-align / underline                           |
| Animation          | Framer Motion                                                                                                                                                                                                                                                                      | `^12.38.0`                                                                                                              |
| Icons              | `lucide-react` (actions), `react-icons/si` (company logos)                                                                                                                                                                                                                         |
| Backend runtime    | Node.js ≥ 22.12.0                                                                                                                                                                                                                                                                  | engines pin                                                                                                             |
| Backend framework  | Express                                                                                                                                                                                                                                                                            | `^4.21.2`                                                                                                               |
| RPC                | tRPC                                                                                                                                                                                                                                                                               | `^11.6.0` (client + server + react-query) with `superjson` serializer                                                   |
| ORM                | Drizzle                                                                                                                                                                                                                                                                            | `^0.45.2`, drizzle-kit `^0.31.10`                                                                                       |
| Database driver    | `pg` (node-postgres)                                                                                                                                                                                                                                                               | `^8.20.0`                                                                                                               |
| Queue              | pg-boss                                                                                                                                                                                                                                                                            | `^12.18.2` (PostgreSQL-native, no Redis required for jobs)                                                              |
| Auth               | Supabase Auth                                                                                                                                                                                                                                                                      | `@supabase/supabase-js ^2.105.1`                                                                                        |
| Rate limit         | Upstash Redis                                                                                                                                                                                                                                                                      | `@upstash/ratelimit ^2.0.8`, `@upstash/redis ^1.37.0`                                                                   |
| Payments           | Stripe                                                                                                                                                                                                                                                                             | `^20.3.1` (`STRIPE_API_VERSION` pinned in stripe client)                                                                |
| Email              | Resend                                                                                                                                                                                                                                                                             | `^6.12.2` (17 transactional templates)                                                                                  |
| File storage       | Cloudflare R2                                                                                                                                                                                                                                                                      | via `@aws-sdk/client-s3 ^3.1041.0`, `@aws-sdk/s3-request-presigner`                                                     |
| PDF                | PDFKit (server-side) + Puppeteer (`^24.42.0`) for HTML→PDF where needed                                                                                                                                                                                                            |
| LLMs               | OpenAI SDK `^6.35.0`, Anthropic SDK `^0.92.0`, AI SDK adapters (`@ai-sdk/openai`, `@ai-sdk/anthropic`, top-level `ai ^6.0.168`), LangChain v1 (`@langchain/core`, `@langchain/anthropic`, `@langchain/openai`, `@langchain/langgraph`, `@langchain/langgraph-checkpoint-postgres`) |
| Monitoring         | Sentry (`@sentry/node`, `@sentry/react`) + Pino structured logger (`pino`, `pino-pretty`)                                                                                                                                                                                          |
| Tests              | Vitest `^4.1.5`, Playwright `^1.59.1`, vitest-coverage-v8                                                                                                                                                                                                                          |
| Package manager    | pnpm `10.4.1+` (engines pin)                                                                                                                                                                                                                                                       |
| Deployment         | Railway (Docker multi-stage)                                                                                                                                                                                                                                                       |

---

## Monorepo layout

```
ttml-app/
├── client/                     # React 19 SPA (Vite)
│   ├── src/
│   │   ├── App.tsx             # wouter route definitions
│   │   ├── main.tsx            # entry — Sentry init, tRPC provider, theme
│   │   ├── index.css           # Tailwind v4 @theme inline + keyframes
│   │   ├── _core/hooks/        # auth hook (unusual _core path)
│   │   ├── hooks/              # useToast, useMobile, useLetterRealtime, useLetterStream
│   │   ├── contexts/           # ThemeContext, etc.
│   │   ├── lib/                # trpc.ts, supabase.ts, queryClient.ts, sentry.ts
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui primitives
│   │   │   ├── shared/         # cross-role (ReviewModal, SubscriberLetterPreviewModal)
│   │   │   ├── subscriber/     # dashboard/, letter-detail/ feature subtrees
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── LetterPaywall.tsx
│   │   └── pages/              # see frontend.md for full list
├── server/                     # Express + tRPC backend
│   ├── _core/                  # entry, env, context, tRPC init, admin2fa, cookies, vite-dev integration
│   │   ├── index.ts            # Express boot + middleware
│   │   ├── env.ts              # ENV object + validateRequiredEnv()
│   │   ├── trpc.ts             # publicProcedure, protectedProcedure, adminProcedure, superAdminProcedure
│   │   ├── context.ts          # TrpcContext
│   │   ├── admin2fa.ts         # signed cookie verification
│   │   └── vite.ts             # dev SSR / prod static serving
│   ├── routers/                # tRPC sub-routers (see api-surface.md)
│   ├── db/                     # data access layer — all DB I/O goes through here
│   ├── pipeline/               # 4-stage pipeline + LangGraph (see pipeline.md)
│   ├── learning/               # recursive learning extraction
│   ├── stripe/                 # Stripe client + checkout + coupon helpers
│   ├── email.ts                # Resend templates
│   ├── pdfGenerator.ts         # PDFKit
│   ├── supabaseAuth.ts         # JWT verify + user sync + SUPER_ADMIN_EMAILS whitelist
│   ├── stripeWebhook.ts        # Stripe webhook (raw body)
│   ├── n8nCallback.ts          # dormant n8n callback handler
│   ├── intake-normalizer.ts    # intake data standardization
│   ├── rateLimiter.ts          # Upstash fail-closed (auth) / fail-open (general)
│   ├── worker.ts               # pg-boss worker entrypoint
│   ├── migrate.ts              # Drizzle migration runner
│   ├── instrument.ts           # Sentry init (loaded before main)
│   ├── cronScheduler.ts        # background cron
│   ├── freePreviewEmailCron.ts # idempotent free-preview email dispatcher
│   ├── stalePipelineLockRecovery.ts  # auto-release stuck pipeline locks (15 min)
│   ├── staleReviewReleaser.ts  # auto-release unclaimed attorney reviews
│   └── *.test.ts               # Vitest co-located
├── shared/                     # types + constants shared across client/server
│   ├── types/                  # letter status machine, Zod schemas
│   ├── pricing.ts              # single source of truth for prices
│   └── const.ts                # error message constants
├── drizzle/                    # ORM
│   ├── schema.ts               # barrel re-export
│   ├── schema/                 # 7 modular files (see data-model.md)
│   ├── relations.ts
│   └── migrations/             # SQL migration files
├── e2e/                        # Playwright
│   ├── platform/               # 07-full-lifecycle.spec.ts and friends
│   └── README.md
├── attached_assets/            # HTML letter templates loaded at runtime
├── docs/                       # see SKILL.md ownership table
├── scripts/                    # seed-test-users.ts, check-migrations.mjs, etc.
├── skills/                     # this skill + architectural-patterns/ + platform-e2e-verification/
├── skills-audit/               # corrected ttml-* specialist skills + audit doc
├── blog/                       # markdown blog posts for /blog
├── plugins/                    # route-handle plugin skeleton
├── .github/                    # workflows, copilot-instructions.md
├── .claude/                    # repo-conventions, citation queries
├── AGENTS.md, ARCHITECTURE.md, CLAUDE.md, README.md, ...
├── package.json, pnpm-lock.yaml
├── Dockerfile, docker-compose.yml, docker-entrypoint.sh
├── vite.config.ts, vitest.config.ts, vitest.setup.ts
├── tsconfig.json, eslint.config.mjs, .prettierrc
├── drizzle.config.ts
└── playwright.config.ts
```

---

## Path aliases

Set identically in `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`:

| Alias       | Resolves to         |
| ----------- | ------------------- |
| `@/*`       | `client/src/*`      |
| `@shared/*` | `shared/*`          |
| `@assets/*` | `attached_assets/*` |

Do not modify `vite.config.ts`, `tsconfig.json`, or `drizzle.config.ts` without explicit user approval.

---

## Build commands

From `package.json` (current scripts):

```bash
pnpm install                 # install
pnpm dev                     # NODE_ENV=development tsx watch server/_core/index.ts
pnpm check                   # tsc --noEmit (alias: pnpm lint)
pnpm test                    # vitest run (~1300 tests across ~54 files)
pnpm test:e2e                # playwright test
pnpm build                   # vite build + esbuild server/worker/migrate/instrument + prerender
pnpm start                   # NODE_ENV=production + dns ipv4first + sentry instrument + dist/index.js
pnpm db:migrate              # node dist/migrate.js (after build)
pnpm start:migrate           # migrate + start (production-like single-process)
pnpm db:push                 # drizzle-kit generate + migrate
pnpm db:check-migrations
pnpm db:backfill-migrations
pnpm format                  # prettier --write .
pnpm revalidate              # full re-verification: check + test + vite build
```

**Pre-PR validation gate:** `pnpm check` → `pnpm test` → `pnpm build` must all pass.

### Build artifacts (esbuild → `dist/`)

| Entry                   | Output                                                       |
| ----------------------- | ------------------------------------------------------------ |
| `server/_core/index.ts` | `dist/index.js` (web)                                        |
| `server/worker.ts`      | `dist/worker.js` (pipeline worker)                           |
| `server/migrate.ts`     | `dist/migrate.js` (one-shot migrations)                      |
| `server/instrument.ts`  | `dist/instrument.js` (Sentry init, loaded via `--import`)    |
| `client/src`            | `dist/public/` (static assets via `vite build`)              |
| `scripts/prerender.ts`  | `dist/_prerender/` (static HTML for data-free public routes) |

All built as ESM, externalizing `@tailwindcss/vite`, `@vitejs/plugin-react`, and `vite` (devDeps not needed at runtime).

---

## Deploy topology

Single Docker image, dispatched by `docker-entrypoint.sh` based on the `PROCESS_TYPE` env var.

| Role     | `PROCESS_TYPE`  | Command                                             | Purpose                                                    |
| -------- | --------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| Web      | `web` (default) | `node --import ./dist/instrument.js dist/index.js`  | Express + tRPC + static client. Health: `/api/health`.     |
| Worker   | `worker`        | `node --import ./dist/instrument.js dist/worker.js` | pg-boss job consumer. Headless, no domain.                 |
| Migrate  | `migrate`       | `node dist/migrate.js`                              | One-shot Drizzle migration runner. Restart policy = Never. |
| (legacy) | `all`           | runs migrate → background worker → web              | Single-container local convenience mode                    |

Railway deploy order: migrate first → then web + worker.

Local docker-compose:

```bash
docker compose build
docker compose run --rm migrate
docker compose up app worker
```

See [ops-deploy.md](ops-deploy.md) for the full deploy contract, security headers, and rate-limit configuration.

---

## Vite manual chunks (don't duplicate)

Configured in `vite.config.ts` — heavy libs are split into named vendor bundles:

`vendor-tiptap`, `vendor-stripe`, `vendor-supabase`, `vendor-radix`, `vendor-pdf`, `vendor-ai`, `vendor-icons`, `vendor-react`.

Do not add a Vite proxy — the dev server already integrates with Express via `server/_core/vite.ts`.

---

## Code style

- **Prettier** (`.prettierrc`) is the sole formatter: `semi: true`, `singleQuote: false`, `trailingComma: "es5"`, `printWidth: 80`, `tabWidth: 2`, `arrowParens: "avoid"`, `endOfLine: "lf"`.
- **ESLint** flat config (`eslint.config.mjs`) — intentionally lightweight; project relies on `tsc` for type-checking. One custom rule: Pino merge-object first (`logger.error({ err }, "message")`).
- **No `import React`** — Vite JSX transform handles it.
- **Drizzle types** — infer with `typeof users.$inferSelect` / `$inferInsert`. Insert schemas use `createInsertSchema` from `drizzle-zod` with `.omit`.
- **File naming** — Components `PascalCase.tsx`, utilities/hooks `camelCase.ts`, tests `*.test.ts`.

---

**Sources read:** `package.json`, `tsconfig.json`, root directory listing, `AGENTS.md` §2–§6, `CLAUDE.md`. See [ops-deploy.md](ops-deploy.md) for the Dockerfile + entrypoint detail.
