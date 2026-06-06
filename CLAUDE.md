# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **For the canonical agent reference (tech stack, conventions, gotchas, env vars), see [`AGENTS.md`](AGENTS.md).**  
> **For architecture, module map, and status machine, see [`ARCHITECTURE.md`](ARCHITECTURE.md).**  
> **For developer workflow and pitfalls, see [`docs/AGENT_GUIDE.md`](docs/AGENT_GUIDE.md).**

---

## Commands

```bash
pnpm install                       # install dependencies (Node ≥22.12, pnpm ≥10.4)
pnpm dev                           # tsx watch server/_core/index.ts — Express + Vite HMR, port 3000
pnpm check                         # tsc --noEmit — must pass before commit
pnpm test                          # vitest run — ~83 test files under server/
pnpm test -- server/foo.test.ts    # single file: pnpm test -- server/phase67-pricing.test.ts
pnpm test:e2e                      # Playwright (e2e/)
pnpm build                         # vite build + esbuild bundles (index, worker, migrate, instrument) → dist/
pnpm revalidate                    # check + test + build in one shot — preferred PR gate
pnpm db:push                       # drizzle-kit generate && migrate
pnpm db:check-migrations           # scripts/check-migrations.mjs
pnpm format                        # prettier --write .
```

**Validation gate** (run before every PR): `pnpm revalidate` (single command runs `check → test → build`).

---

## Core Architectural Invariants

Detailed enforcement rules live in `skills/architectural-patterns/`. **Never violate these.**

1. **Mandatory Attorney Review** — Every AI-generated letter must be reviewed by an attorney. The `ai_draft` letter version is immutable — always create a new `attorney_edit` version. Log all attorney actions via `logReviewAction` in `server/db/review-actions.ts`.

2. **Strict Status Machine** — All transitions validated against `ALLOWED_TRANSITIONS` in `shared/types/letter.ts`. No skipping states. Use `isValidTransition()`. Only `superAdminProcedure` paths (force transition / force unlock) may bypass. Never hardcode status strings.
   - Canonical `LETTER_STATUSES` tuple and `LetterStatus` union live in `drizzle/schema/constants.ts` — import from there for type checks and DB writes.
   - `LETTER_STATUS` key-map, `ALLOWED_TRANSITIONS`, `isValidTransition()`, and `STATUS_CONFIG` live in `shared/types/letter.ts` — import from there for transitions and UI metadata.

3. **RBAC Enforcement** — Use tRPC procedure guards. Never rely on client-side checks.
   - From `server/_core/trpc.ts`: `publicProcedure`, `protectedProcedure`, `emailVerifiedProcedure`, `adminProcedure`, `superAdminProcedure`.
   - From `server/routers/_shared.ts`: `subscriberProcedure`, `verifiedSubscriberProcedure`, `attorneyProcedure`, `employeeProcedure` (all built on `protectedProcedure` / `emailVerifiedProcedure`).
   - `adminProcedure` requires the `admin_2fa` cookie (`server/_core/admin2fa.ts`).
   - `superAdminProcedure` additionally enforces a hard-coded owner email whitelist (`HARDCODED_OWNER_EMAILS` in `server/_core/trpc.ts`) and is the **only** path permitted to skip the status machine (force transition, force free-preview unlock).

4. **Super Admin Whitelist** — Owner emails are hard-coded in `server/_core/trpc.ts` (`HARDCODED_OWNER_EMAILS`) and `server/supabaseAuth.ts` (`SUPER_ADMIN_EMAILS`). Cannot be modified via UI or API. Do not generate any endpoint or UI to assign the `admin` role dynamically.

5. **Payment Gate** — Three subscriber-visible UI states, one set of server-side rules:
   - **Pre-unlock (locked)** — while the letter is in any `LOCKED_PREVIEW_STATUSES` from `shared/types/letter.ts` (24-hour hold `ai_generation_completed_hidden` + the upsell statuses; legacy `generated_locked` retained for back-compat), `server/db/letter-versions.ts` / `server/routers/versions.ts` truncate the `ai_draft` content to ~100 chars. The client shows `client/src/components/LetterPaywall.tsx` — a styled `LockedLetterDocument` modal with subscribe/checkout CTAs. No payment yet, no full content.
   - **Post-unlock draft preview (free-trial path)** — if `letter_requests.is_free_preview = TRUE` AND `free_preview_unlock_at <= NOW()` (the 24h cooling window has elapsed), `server/routers/letters/subscriber.ts` sets `freePreviewUnlocked = true` and `getLetterVersionsByRequestId` returns the FULL un-truncated, un-redacted `ai_draft` tagged `freePreview: true`. The client renders `client/src/components/DraftPreviewViewer.tsx` (alias of `FreePreviewViewer.tsx`) — a modal with the full letter inside, copy-resistant (`user-select: none`, blocked `onCopy/onCut/onContextMenu`, keyboard-shortcut guards) and a large diagonal "DRAFTED" watermark across the middle. The CTA is "Submit For Attorney Review" which routes to `/pricing` for the free-trial → subscription upgrade.
   - **Post-unlock draft preview (paid path)** — active paid subscribers who advance past the upsell statuses see the same `DraftPreviewViewer` modal (full letter + "DRAFTED" watermark + copy-resistant), but the CTA submits directly to attorney review (no `/pricing` detour). The 24h cooling window is stamped at submit time and enforced server-side — never trust the client.
   - **Admin force-unlock override** — Admins can collapse the 24h cooling window via the `forceFreePreviewUnlock` tRPC mutation (`server/routers/admin/letters.ts`). It sets `free_preview_unlock_at = NOW()`, logs a `free_preview_force_unlock` review action, and invokes the shared dispatcher `dispatchFreePreviewIfReady` in `server/freePreviewEmailCron.ts`. The "your preview is ready" email fires immediately if the draft is already saved; if the pipeline is still running it fires the moment the draft lands (pipeline finalize in `simple.ts` / `graph/nodes/finalize.ts` / `fallback.ts` also calls the dispatcher). The dispatcher uses an atomic `UPDATE ... RETURNING` claim on `free_preview_email_sent_at` so cron, pipeline, and admin paths cannot double-send; a failed send rolls the stamp back so the cron retries. Non-free-preview letters cannot use this path — the mutation rejects with `BAD_REQUEST`.

---

## Pre-Change Checklist

Before making any changes, check:

| Concern | File |
| ------- | ---- |
| Schema | `drizzle/schema/` (multi-file) + `drizzle/schema/constants.ts` (`LETTER_STATUSES` tuple, `LetterStatus` union) |
| Status transitions | `shared/types/letter.ts` → `ALLOWED_TRANSITIONS`, `isValidTransition()`, `STATUS_CONFIG` |
| tRPC procedure guards | `server/_core/trpc.ts` (admin / super-admin / email-verified) + `server/routers/_shared.ts` (role guards) |
| AI pipeline (legacy / fallback) | `server/pipeline/orchestrator.ts` + `server/pipeline/{orchestration,research,vetting}/` |
| AI pipeline (LangGraph / default) | `server/pipeline/graph/index.ts` + `server/pipeline/graph/nodes/{init,research,draft,assembly,vetting,finalize}.ts` |
| LLM failover (OpenAI / Anthropic, Gemini dormant) | `server/pipeline/graph/nodes/llm-failover.ts` → `callLlmWithFailover()` |
| Pipeline route resolver | `server/pipeline/routing.ts` → `resolvePipelineExecutionRoute()` |
| Audit trail | `logReviewAction` → `review_actions` table (`server/db/review-actions.ts`) |
| Pricing | `shared/pricing.ts` (never hardcode: $299/letter, $299/mo, $2,400/yr) |
| Env vars | `server/_core/env.ts` → `ENV` object + `validateRequiredEnv()` (AI-related fields are lazy getters — see Gotchas) |

### Refactor Landmarks

- `client/src/pages/subscriber/Dashboard.tsx` is a composition shell; keep feature UI in `client/src/components/subscriber/dashboard/`.
- `client/src/pages/subscriber/LetterDetail.tsx` is a composition shell; keep status-specific UI in `client/src/components/subscriber/letter-detail/` (the single canonical subtree — do not recreate `pages/subscriber/letter-detail/`).
- Admin router is modularized via `server/routers/admin/index.ts` and composed from `server/routers/admin/{letters,users,jobs,learning}.ts`.
- Letters router is modularized via `server/routers/letters/index.ts` and composed from `server/routers/letters/{submit,subscriber,client-approval}.ts`. The same per-feature subdirectory pattern applies to `server/routers/review/`, `server/routers/affiliate/`, and `server/routers/billing/`.
- Flat top-level routers — `server/routers/{auth,blog,documents,intakeFormTemplates,notifications,profile,templates,versions}.ts` — stay as single files. They are intentionally not modularized: don't split them into `*/index.ts` subdirectories unless one grows to a comparable size to `admin/` or `letters/`.
- Pipeline stages live in subdirectories: `server/pipeline/{research,vetting,orchestration,graph,prompts}/`. `VettingResult` is exported from `server/pipeline/vetting/index.ts` (not `shared/types`). Pipeline routing between the simple path, LangGraph (`graph/`), and `fallback.ts` happens in `server/pipeline/routing.ts`.
- **LangGraph LLM calls go through `callLlmWithFailover()` in `server/pipeline/graph/nodes/llm-failover.ts`** — every stage (research / draft / assembly / vetting) uses the same helper. Don't instantiate `ChatOpenAI` / `ChatAnthropic` directly in a new node. The helper picks model by `tier: "primary" | "lite"` and honors a per-call `anthropicModel` override for stage-canonical models on fallback (Stage 3 Assembly → `claude-sonnet-4-5-20250929`, Stage 4 Vetting → `claude-sonnet-4-6`).
- DB layer: every router imports data-access functions from `server/db/<feature>.ts` (e.g. `letter-versions.ts`, `review-actions.ts`, `pipeline-records.ts`, `letters/`). Do not write raw Drizzle in routers.
- Avoid reintroducing monolithic route/page files unless explicitly requested.
- **Before splitting a `*.ts` file into a `*/index.ts` subdirectory, read the Module Move Checklist in [`docs/AGENT_GUIDE.md`](docs/AGENT_GUIDE.md) §1.14** — every relative import inside the moved file shifts one level deeper, and tests that source-grep the old path break silently.

---

## Critical Gotchas

### Tailwind CSS v4 (NOT v3)

- No `tailwind.config.js` — all config lives in `client/src/index.css` under `@theme inline` blocks.
- Colors use OKLCH format. CSS property values use `H S% L%` space-separated — do NOT wrap in `hsl()`.

### tRPC vs REST

Almost all client-server calls use tRPC v11. REST is reserved for cases tRPC cannot serve (multipart uploads, raw webhook bodies, file streaming, server-rendered HTML). All REST routes are mounted from `server/_core/index.ts` via `register*Route(app)` helpers — do **not** add new REST routes inline; create a new `registerFooRoute` module.

Current REST surface, by registrar:

- `server/supabaseAuth/routes/` → `signup-login.ts`, `password.ts`, `verification.ts`, `oauth.ts`, `admin-2fa.ts` (mounted under `/api/auth/…`)
- `server/n8nCallback.ts` → `POST /api/pipeline/n8n-callback`
- `server/draftPdfRoute.ts` → `GET /api/letters/:id/draft-pdf` (streamed PDF)
- Stripe webhook (raw body parser, separate from `express.json()` middleware)
- `server/blogInternalRoutes.ts`, `sitemapRoute.ts`, `newsletterRoute.ts`, `configRoute.ts`, `clientPortalRoute.ts`, `emailPreview.ts`, `paywallEmailCron.ts`, `freePreviewEmailCron.ts`, `draftReminders.ts`, `sentryDebugRoute.ts`
- Health: `/health`, `/api/health`, plus `/health/details` and `/api/health/details`

### Pipeline routing

- `server/pipeline/routing.ts` selects between `simple.ts`, the LangGraph graph under `server/pipeline/graph/`, and `fallback.ts`.
- tRPC routers must enqueue pipeline jobs via pg-boss; `server/worker.ts` consumes them. Never call pipeline functions directly from a router.
- **Default since PR #58**: `resolvePipelineExecutionRoute` returns `langgraph` for any non-free-trial submission. **Emergency rollback**: set `LANGGRAPH_DISABLED=true` to force everything back through the `standard` (n8n) route without a redeploy — separate knob from `LANGGRAPH_PIPELINE`, which only gates LangGraph internals inside the worker.
- Provider order inside `callLlmWithFailover`: OpenAI (primary) → Anthropic (fallback). Gemini code (`callGemini`, `MODELS.gemini`) is plumbed but **dormant** — no orchestrator branch calls it because the configured key has free-tier quota 0. Cloudflare AI Gateway is also wired but inert unless `CF_AI_GATEWAY_BASE_URL` is set.

### ENV — AI fields are lazy getters

In `server/_core/env.ts`, AI-related fields (`anthropicApiKey`, `openAiApiKey`, `perplexityApiKey`, `geminiApiKey`, `geminiModel`, `cfAiGatewayBaseUrl`) are defined as getters, **not snapshot values**. They re-read `process.env` on every access. This is required so tests (notably `server/phase92-langgraph-pipeline.test.ts`) can mutate `process.env` in `beforeEach` to control failover routing. If you add a new AI-related env var, use the same getter pattern — don't capture at import time.

### Infra dependencies

- **Storage** — Cloudflare R2 (`R2_*` env vars) is required at startup (`validateRequiredEnv()` in `server/_core/env.ts`); used for PDFs and uploaded documents.
- **Workers** — Optional Cloudflare Workers for email (`EMAIL_WORKER_URL`), PDF generation (`PDF_WORKER_URL`), KV cache (`KV_WORKER_URL`), blog cache (`CF_BLOG_CACHE_WORKER_URL`), and affiliate redirects (`AFFILIATE_WORKER_URL`). When unset, the server falls back to local Puppeteer / direct Resend / no cache.
- **Queue & cache** — pg-boss runs on the same Postgres for job queuing. Upstash Redis (`UPSTASH_REDIS_*`) backs `@upstash/ratelimit`.
- **Observability** — Pino (`server/instrument.ts` is preloaded at boot via the `start` script's `--import`) and Sentry (Node + React). When logging with Pino, pass the merge object first: `logger.info({ err }, "msg")` — never `logger.info("msg", err)`.
- **AI providers** — Anthropic + OpenAI + Perplexity, orchestrated via the Vercel AI SDK and LangChain/LangGraph (now on the **1.x** line, with the Postgres checkpointer at `@langchain/langgraph-checkpoint-postgres`). When authoring or editing graph nodes under `server/pipeline/graph/`, use the LangGraph 1.x API — pre-1.0 signatures and channel shapes have changed. GCP/Vertex AI + GCS (`GCP_*`, `GCS_TRAINING_BUCKET`) are optional and used only by training capture / fine-tune paths.

### TanStack Query v5

- **Object form only**: `useQuery({ queryKey: ['key'] })` — NOT `useQuery(['key'])`.
- Do NOT define your own `queryFn` on tRPC queries — the default fetcher is pre-configured.
- After every mutation, invalidate cache: `queryClient.invalidateQueries({ queryKey: [...] })`.

### Drizzle ORM

- Arrays: use `text().array()` — NOT `array(text())`.
- All DB operations go through `server/db/` data access functions — never write raw Drizzle in routers.
- Drizzle config reads `SUPABASE_DATABASE_URL` or `DATABASE_URL`.

### Authentication

- Supabase Auth issues JWTs; server syncs to local `users` table on every request (30s cache).
- JWTs read from `Authorization` header OR `sb_session` httpOnly cookie.
- `useAuth` hook lives at `client/src/_core/hooks/useAuth.ts` (note the `_core` path).
- Role changes take effect via `invalidateUserCache()` server-side + `refetchOnWindowFocus` on the client.

### Frontend

- Stack: **React 19 + Vite 8** with the automatic JSX transform. Do NOT `import React` at the top of files, and avoid legacy namespace patterns like `React.FC` or `React.useState` — import hooks/types from `react` directly (`import { useState } from 'react'`). `React.lazy` is the documented exception (see lazy-pages bullet below).
- Routing: `wouter` (not React Router). Use `Link` / `useLocation`.
- Every interactive element needs `data-testid` following pattern `{action}-{target}`.
- Frontend env vars: must be prefixed `VITE_` and accessed via `import.meta.env.VITE_*`.
- Pages use `React.lazy` with `lazyRetry` wrapper — register new pages in `App.tsx`.

### Do Not Modify Without Cause

`package.json` scripts, `vite.config.ts`, `server/_core/vite.ts`, `drizzle.config.ts`, `tsconfig.json` — full list and rationale in [`AGENTS.md` §16](AGENTS.md#16-critical-gotchas-for-agents).

---

## Path Aliases

Canonical table in [`AGENTS.md` §6](AGENTS.md#6-path-aliases) — `@/*` → `client/src/*`, `@shared/*` → `shared/*`, `@assets/*` → `attached_assets/*`.

---

## Key Workflows

**Letter lifecycle (primary happy path):** `submitted → researching → drafting → ai_generation_completed_hidden → letter_released_to_subscriber → attorney_review_upsell_shown → attorney_review_checkout_started → attorney_review_payment_confirmed → pending_review → under_review → approved → client_approval_pending → client_approved → sent`. Recovery edges: `pipeline_failed → submitted`, `needs_changes → submitted`, `rejected → submitted`, `client_revision_requested → pending_review`. Full map in `shared/types/letter.ts` → `ALLOWED_TRANSITIONS`.

**PDF generation** is triggered on `clientApprove` (subscriber action) — not when the attorney submits.

**Pipeline worker** (`server/worker.ts`) consumes pg-boss jobs. Do not call pipeline stages directly from tRPC routers.

**Recursive learning** (`server/learning/`): attorney edits generate lessons stored in `pipeline_lessons`, injected into future AI prompts. Managed at `/admin/learning`.

### LangGraph pipeline (default route since PR #58)

Product routing in `server/pipeline/routing.ts → resolvePipelineExecutionRoute`:

- `isFreeTrialSubmission` → **`simple`** pipeline (one Claude call, no research / vetting).
- Anything else → **`langgraph`** state graph (`isPaidSubscriberSubmission` explicit, plus the fallthrough default).
- Emergency rollback knob: `LANGGRAPH_DISABLED=true` → forces `standard` (n8n) route for non-free-trial submissions.

LangGraph stages live under `server/pipeline/graph/nodes/`. Each LLM-calling stage routes through `callLlmWithFailover()` with this provider order:

1. **OpenAI** — primary. `gpt-4o` for `tier: "primary"`, `gpt-4o-mini` for `tier: "lite"`.
2. **Anthropic** — fallback. `claude-sonnet-4-5-20250929` for primary, `claude-haiku-4-5-20251001` for lite. Pass `anthropicModel` in `LlmCallOptions` to override per-stage (Assembly pins `sonnet-4-5`; Vetting pins `sonnet-4-6-20250514`).

Stage configuration (verified against `server/pipeline/graph/nodes/`):

| Stage | Tier | Temperature | Anthropic pin |
| --- | --- | --- | --- |
| Research | lite | 0 | (tier default) |
| Draft | primary (default) | 0.5 | (tier default) |
| Assembly | primary (default) | 0.3 | `claude-sonnet-4-5-20250929` |
| Vetting | lite | 0 | `claude-sonnet-4-6` |

---

## Testing

Vitest; ~83 test files under `server/`. Some are phase-numbered (e.g. `phase92-langgraph-pipeline.test.ts`, `phase97-letter-lifecycle.test.ts`); others are feature-named (e.g. `attorney-review-pipeline.test.ts`, `entitlement-matrix.test.ts`, `paywall-status.test.ts`). Playwright e2e specs live under `e2e/`.

Run a single file:

```bash
pnpm test -- server/phase67-pricing.test.ts
```

Seeded test credentials (subscriber / employee / attorney / admin at `@ttml.dev`, password `TestPass123!`) — see [`AGENTS.md` §12.4](AGENTS.md#124-test-credentials-seeded-via-scripts) for the full table.

### Gated live smoke tests

Tests that actually hit external LLM providers are **gated behind an env flag** so a normal `pnpm test` cannot accidentally burn API credits. The canonical example is `server/phase93-smoke-langgraph-live.test.ts`, which uses `it.skipIf(!process.env.LANGGRAPH_SMOKE_LIVE)`. To run it:

```bash
LANGGRAPH_SMOKE_LIVE=1 pnpm test phase93-smoke-langgraph
```

Convention for new live-LLM tests: name them `phaseNN-*-live.test.ts`, gate every `it` with `it.skipIf(!process.env.<FLAG>_LIVE)`, mock DB writes so no rows hit prod Supabase, and write any captured output to `.smoke-test-output/` (gitignored). Live smoke output is **not** intended for CI — it's a manual verification tool.

### Mock-path drift protection (phase92)

`server/phase92-langgraph-pipeline.test.ts` mocks `ChatAnthropic`. The mock disambiguates stages by system-prompt content (e.g. `"legal research assistant"` → research). The default-fallback branch of `invoke()` and the `stream()` generator both **throw** instead of returning benign payloads — this is intentional. If a future prompt edit makes a stage's system prompt not match any branch, the test fails loudly with the offending prompt prefix rather than silently passing on a fake response.
