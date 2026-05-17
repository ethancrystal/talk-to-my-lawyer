# ARCHITECTURE.md - Talk to My Lawyer

> **Single source of truth** for the system's architecture, module boundaries, and ownership map.
> **For agent conventions and gotchas:** See [`AGENTS.md`](AGENTS.md)
> **For deployment and env vars:** See [`docs/PRODUCTION_RUNBOOK.md`](docs/PRODUCTION_RUNBOOK.md)
> Last verified: 2026-05-17 against `origin/main` commit `e9be5d1`.

---

## App Overview

**Platform:** Talk to My Lawyer is a full-stack legal letter platform where users submit legal situations, AI generates professional letters, and a licensed attorney reviews before delivery.

**Production URL:** <https://www.talk-to-my-lawyer.com>

---

## Tech Stack

| Layer                  | Technology                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| Frontend               | React 19, Vite 8, TypeScript, Tailwind CSS v4 (OKLCH), shadcn/ui, wouter, TanStack Query |
| Backend                | Node.js, Express 4.21, tRPC 11.6, TypeScript                                             |
| Database               | PostgreSQL on Supabase, Drizzle ORM 0.45                                                 |
| Auth                   | Supabase Auth (JWT via `sb_session` httpOnly cookie), Row-Level Security                 |
| AI - Research          | OpenAI `gpt-4o-search-preview` (web search); Perplexity `sonar-pro` optional failover    |
| AI - Drafting/Assembly | Anthropic Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)                               |
| AI - Vetting           | Anthropic Claude Sonnet 4.6 (`claude-sonnet-4-6-20250514`)                               |
| AI - Doc Analysis      | OpenAI GPT-4o                                                                            |
| Payments               | Stripe (Monthly $299, Yearly $2,400; single-letter $299 is deprecated)                   |
| Email                  | Resend transactional email templates                                                     |
| Background Jobs        | pg-boss (PostgreSQL-native queue)                                                        |
| Rate Limiting          | Upstash Redis via `@upstash/ratelimit` (fail-open for general; fail-closed for auth)     |
| Rich Text Editing      | Tiptap (attorney review)                                                                 |
| PDF Generation         | Cloudflare Worker Browser Rendering API primary; local Puppeteer fallback                |
| Monitoring             | Sentry (frontend + backend) + Pino structured logger                                     |
| Deployment             | Railway (Docker multi-stage build)                                                       |

---

## User Roles

| Role        | DB Enum      | Access Scope                                                              | Dashboard Route |
| ----------- | ------------ | ------------------------------------------------------------------------- | --------------- |
| Subscriber  | `subscriber` | Own letters, billing, profile                                             | `/dashboard`    |
| Employee    | `employee`   | Affiliate dashboard, discount codes, commissions, payouts                 | `/employee`     |
| Attorney    | `attorney`   | Review Center queue/detail and SLA dashboard                              | `/attorney`     |
| Super Admin | `admin`      | Full platform access, user management, jobs, letters, affiliate oversight | `/admin`        |

> **Full access matrix:** [`docs/ROLE_AREA_MATRIX.md`](docs/ROLE_AREA_MATRIX.md)

---

## Status Machine (Letter Lifecycle)

Defined in `shared/types/letter.ts` through `ALLOWED_TRANSITIONS`, with the active persisted enum values in `drizzle/schema/constants.ts`. This is the single source of truth for status transitions.

```text
submitted -> researching -> drafting
                         -> ai_generation_completed_hidden
                         -> generated_locked

ai_generation_completed_hidden -> letter_released_to_subscriber
                                -> under_review (admin bypass)
                                -> pipeline_failed

letter_released_to_subscriber -> attorney_review_upsell_shown
                               -> attorney_review_checkout_started
                               -> pending_review

attorney_review_upsell_shown -> attorney_review_checkout_started
                              -> pending_review

attorney_review_checkout_started -> attorney_review_payment_confirmed
                                  -> pending_review

attorney_review_payment_confirmed -> pending_review
generated_locked -> pending_review

pending_review -> under_review
under_review -> approved | rejected | needs_changes | pending_review
needs_changes -> submitted | pending_review
approved -> client_approval_pending | client_revision_requested | sent
client_approval_pending -> client_approved | client_revision_requested | client_declined
client_revision_requested -> pending_review | under_review
client_approved -> sent
rejected -> submitted
pipeline_failed -> submitted
```

**Key rules:**

- `ai_generation_completed_hidden` is the 24-hour hold status before subscriber visibility. After the hold expires the letter can release to `letter_released_to_subscriber`.
- `generated_locked` is the locked draft-preview status used by server-side version gating.
- Free-preview funnel: `letter_released_to_subscriber` -> `attorney_review_upsell_shown` -> checkout -> `attorney_review_payment_confirmed` -> `pending_review`.
- Admin bypass: admins can force-transition eligible letters directly to `under_review`, skipping the paywall and cancelling deferred jobs atomically.
- `approved` is transient in normal review flow and forwards to `client_approval_pending`.
- The `ai_draft` version is immutable; attorney edits create `attorney_edit` or `final_approved` versions.

---

## Module Map

### Frontend (`client/src/`)

```text
client/src/
|-- App.tsx                    # Route definitions (wouter)
|-- main.tsx                   # Entry point, Sentry init, tRPC provider
|-- index.css                  # Tailwind v4 theme (OKLCH), animations
|-- _core/hooks/useAuth.ts     # Auth hook (note: _core path)
|-- components/
|   |-- ui/                    # shadcn/ui primitives
|   |-- shared/                # Cross-role components
|   |-- subscriber/            # Subscriber dashboard/detail components
|   |-- ProtectedRoute.tsx     # RBAC route guard
|   `-- LetterPaywall.tsx      # UI blur/CTA only; server truncates protected content
|-- contexts/ThemeContext.tsx  # Dark mode toggle
|-- hooks/                     # useLetterRealtime, useLetterStream, useMobile
|-- lib/                       # trpc.ts, supabase.ts, sentry.ts
`-- pages/
    |-- Home.tsx               # Landing page
    |-- services/              # SEO-targeted service pages, prerendered
    |-- DocumentAnalyzer/      # Free document analyzer
    |-- admin/                 # Admin dashboard pages
    |-- attorney/              # Attorney review pages
    |-- employee/              # Affiliate pages
    `-- subscriber/            # Subscriber dashboard, detail, intake wizard
```

**Modularized pages** use the directory pattern `index.tsx` + `hooks/` + sub-components where appropriate.

- `DocumentAnalyzer/`, `ReviewModal/`, `Learning/`, `Affiliate/`, `AffiliateDashboard/`, `ReviewDetail/`, and `SubscriberLetterPreviewModal/` are modularized feature surfaces.
- `client/src/pages/services/` contains the prerendered service-index and service-detail routes.
- `client/src/pages/subscriber/intake-steps/` contains the multi-step subscriber intake wizard.
- `client/src/pages/subscriber/Dashboard.tsx` composes `client/src/components/subscriber/dashboard/*`.
- `client/src/pages/subscriber/LetterDetail.tsx` composes `client/src/components/subscriber/letter-detail/*`.

### Backend (`server/`)

```text
server/
|-- _core/                       # Express server, tRPC init, context, env, admin2fa, cookies, vite, prerender cache
|-- routers/                     # tRPC sub-routers; see router table below
|-- db/                          # Data access layer (all DB operations go through here)
|-- pipeline/                    # Letter generation pipeline implementations; see pipeline docs
|-- learning/                    # Recursive learning (extraction, quality, categories, dedup)
|-- services/                    # Cross-router service workflows
|-- stripe/                      # Stripe checkout/billing
|-- emailPreview/                # Email template preview
|-- email.ts                     # Resend transactional emails
|-- supabaseAuth.ts              # JWT verification, user sync, super admin whitelist
|-- stripeWebhook.ts             # Stripe webhook handler
|-- pdfGenerator.ts              # HTML-to-PDF: Cloudflare Worker primary, local Puppeteer fallback
|-- workerPdfClient.ts           # Cloudflare PDF Worker client and fallback wrapper
|-- intake-normalizer.ts         # Intake data standardization
|-- rateLimiter.ts               # Upstash rate limiting
|-- n8nCallback.ts               # n8n webhook handler (dormant alternative)
|-- spaRoutes.ts                 # Public SPA route inventory and per-route SEO tag injection
|-- sitemapRoute.ts              # Public sitemap route
|-- newsletterRoute.ts           # Blog newsletter signup endpoint
|-- freePreviewEmailCron.ts      # Idempotent free-preview email dispatcher
|-- worker.ts                    # pg-boss worker
|-- cronScheduler.ts             # Background cron jobs
|-- stalePipelineLockRecovery.ts # Auto-release stuck pipeline locks (15 min)
|-- staleReviewReleaser.ts       # Auto-release unclaimed reviews
`-- instrument.ts                # Sentry init loaded via node --import
```

Implementation notes for maintainability:

- Admin router is decomposed under `server/routers/admin/` with `index.ts` composing `letters.ts`, `users.ts`, `jobs.ts`, and `learning.ts`.
- Public marketing/SEO routes are prerendered at build time by `scripts/prerender.ts` and served in production through `server/_core/prerenderCache.ts` before the SPA fallback.
- Pipeline routing remains owned by `server/pipeline/orchestrator.ts` and `server/worker.ts`, with shared helpers in `server/pipeline/orchestration/` and stage modules in `server/pipeline/research/` and `server/pipeline/vetting/`.
- `server/pipeline/graph/` contains the LangGraph StateGraph implementation. It is documented here only as an alternate execution path; runtime behavior is controlled by environment flags and worker routing.

### Shared (`shared/`)

```text
shared/
|-- types/       # Status machine (letter.ts), Zod schemas, shared inferred types
|-- pricing.ts   # Pricing constants (single source of truth)
`-- const.ts     # Shared constants and error messages
```

### Database (`drizzle/`)

```text
drizzle/
|-- schema.ts                  # Barrel export from ./schema/index
|-- schema/
|   |-- index.ts               # Re-exports all schema modules
|   |-- constants.ts           # pgEnums, const arrays, vector type helper
|   |-- users.ts               # Users and role fields
|   |-- letters.ts             # Letter lifecycle, versions, templates, attachments, analytics
|   |-- billing.ts             # Subscriptions, discounts, commissions, payouts, Stripe idempotency
|   |-- notifications.ts       # Notifications, verification codes, newsletter subscribers
|   |-- pipeline.ts            # Learning, training, fine-tunes, pipeline streams/records
|   `-- content.ts             # Blog posts and document analyses
|-- relations.ts               # Drizzle relation definitions
`-- migrations/                # SQL migration files
```

---

## Database Schema

Drizzle schema is split by domain under `drizzle/schema/`. This table is grouped by schema module and lists the runtime entities agents are most likely to touch.

| Module             | Tables                                                                                                                                                                                                                  | Purpose                                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users.ts`         | `users`                                                                                                                                                                                                                 | Role-based accounts for subscribers, employees, attorneys, and admins                                                                                    |
| `letters.ts`       | `letter_templates`, `letter_requests`, `letter_versions`, `review_actions`, `workflow_jobs`, `research_runs`, `attachments`, `intake_form_templates`, `letter_delivery_log`, `client_portal_tokens`, `letter_analytics` | Letter lifecycle, immutable drafts/edits, review audit trail, pipeline logs, uploaded exhibits, templates, client portal access, delivery, and analytics |
| `billing.ts`       | `subscriptions`, `discount_codes`, `commission_ledger`, `payout_requests`, `commission_payout_allocations`, `processed_stripe_events`                                                                                   | Stripe billing state, affiliate discounts/commissions, payouts, and webhook idempotency                                                                  |
| `notifications.ts` | `notifications`, `email_verification_tokens`, `admin_verification_codes`, `newsletter_subscribers`                                                                                                                      | In-app notifications, auth/email verification, admin 2FA codes, and newsletter signup                                                                    |
| `pipeline.ts`      | `pipeline_lessons`, `letter_quality_scores`, `training_log`, `fine_tune_runs`, `pipeline_records`, `pipeline_stream_chunks`                                                                                             | Recursive learning, model-training capture, fine-tune tracking, and streaming pipeline visibility                                                        |
| `content.ts`       | `blog_posts`, `document_analyses`                                                                                                                                                                                       | Blog CMS content and free document-analyzer results                                                                                                      |

---

## Public AI/Search Surface

Public discoverability is served before the authenticated app surfaces.

- `client/public/robots.txt` declares crawler policy and content-signal directives.
- `client/public/llms.txt` gives AI clients a compact map of core pages, services, and selected blog posts.
- `scripts/prerender.ts` produces static HTML for public marketing routes at build time.
- `server/_core/prerenderCache.ts` serves prerendered HTML in production before the SPA fallback.
- `server/spaRoutes.ts` owns public route inventory and injects per-route SEO metadata/canonical tags into the SPA shell.

---

## tRPC Router Structure

Root router: `server/routers/index.ts` -> `appRouter`. Mounted at `/api/trpc`.

| Sub-Router            | Auth Level                                 | Key Procedures / Responsibility                                                                                                        |
| --------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `system`              | Public                                     | Health and system status checks                                                                                                        |
| `auth`                | Public/Protected                           | Current user, logout, onboarding, auth-adjacent account flows                                                                          |
| `letters`             | Subscriber / Attorney / Admin by procedure | Letter submission, subscriber detail, attachments, delivery, client approval/revision, attorney client-approval requests, admin submit |
| `review`              | Attorney                                   | Review queue, claim/unclaim, approve, reject, request changes, save edit                                                               |
| `admin`               | Admin + 2FA                                | Users, letters, jobs, learning, payouts, force transitions                                                                             |
| `notifications`       | Protected                                  | Notification list, mark read, mark all read                                                                                            |
| `versions`            | Protected, role-aware                      | Letter-version retrieval and server-side draft/paywall content gating                                                                  |
| `billing`             | Protected / Subscriber                     | Subscription status, submit eligibility, billing portal, paywall status, receipts                                                      |
| `affiliate`           | Employee / Admin                           | Employee code/earnings/payout views; admin affiliate oversight                                                                         |
| `profile`             | Protected                                  | Profile updates, email change, password change                                                                                         |
| `documents`           | Protected                                  | Free document analyzer and analysis history                                                                                            |
| `blog`                | Public read / Admin write                  | Blog list/detail plus admin create/update/delete                                                                                       |
| `templates`           | Subscriber read / Admin read               | Active letter templates and admin template inventory                                                                                   |
| `intakeFormTemplates` | Subscriber                                 | Intake-form template listing                                                                                                           |

**REST-only endpoints:** auth signup/login, Stripe webhooks, n8n callback, PDF streaming, public content routes, health checks, sitemap/newsletter/config/client-portal routes.

`admin` router composition: `server/routers/admin/index.ts` merges domain procedures from `server/routers/admin/{letters,users,jobs,learning}.ts`.

---

## AI Pipeline (4 Stages)

The standard pipeline is defined in `server/pipeline/orchestrator.ts`, with modular handlers in `server/pipeline/orchestration/`, `server/pipeline/research/`, and `server/pipeline/vetting/`.

| Stage        | Model                                            | Purpose                                           | Output                |
| ------------ | ------------------------------------------------ | ------------------------------------------------- | --------------------- |
| 1 - Research | OpenAI `gpt-4o-search-preview`                   | Web-grounded legal research with web search       | `ResearchPacket`      |
| 2 - Drafting | Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) | Initial letter draft from research + intake       | `DraftOutput`         |
| 3 - Assembly | Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) | Polish into formal legal letter format            | Assembled letter text |
| 4 - Vetting  | Claude Sonnet 4.6 (`claude-sonnet-4-6-20250514`) | Anti-hallucination, citation check, bloat removal | Vetted letter text    |

- **RAG/Recursive Learning:** Attorney-approved letters are embedded with OpenAI `text-embedding-3-small` and used as reference examples in Stage 2 drafting.
- **Research failover chain:** OpenAI `gpt-4o-search-preview` -> Perplexity `sonar-pro` (if key set) -> OpenAI stored prompt -> Groq Llama 3.3 70B -> synthetic fallback.
- **n8n:** Dormant alternative path, only active when `N8N_PRIMARY=true` and the webhook configuration is valid.
- **Simple pipeline mode:** `PIPELINE_MODE=simple` routes the orchestrator through `server/pipeline/simple.ts`. Worker product routing also uses the simple path for new/non-subscriber first-letter previews.
- **LangGraph mode:** `PIPELINE_MODE=langgraph` routes the orchestrator to the LangGraph implementation. Worker jobs also support `LANGGRAPH_PIPELINE` modes parsed by `server/pipeline/graph/mode.ts`: `true`/`tier3`, `primary`, and `canary` with `LANGGRAPH_CANARY_FRACTION`.
- **Product-level worker routing:** `server/pipeline/routing.ts` keeps product routing in the worker: free-trial preview submissions use `simple`, paid subscriber submissions use `langgraph`, and legacy/admin/retry jobs use `standard`.

For deep pipeline details, see `docs/PIPELINE_ARCHITECTURE.md`.

---

## Core Architectural Invariants

These invariants are enforced across the codebase. Detailed enforcement rules live in `skills/architectural-patterns/`.

1. **Mandatory Attorney Review** - Every AI-generated letter must be reviewed by an attorney. The `ai_draft` version is immutable. See `skills/architectural-patterns/mandatory_attorney_review.md`.
2. **Strict Status Machine** - All transitions are validated against `ALLOWED_TRANSITIONS` in `shared/types/letter.ts`. See `skills/architectural-patterns/strict_status_machine.md`.
3. **RBAC Enforcement** - Access is gated by tRPC middleware (`subscriberProcedure`, `attorneyProcedure`, `adminProcedure`). See `skills/architectural-patterns/rbac_enforcement.md`.
4. **Super Admin Whitelist** - Hard-coded in `server/supabaseAuth.ts`, cannot be modified via UI/API. See `skills/architectural-patterns/super_admin_whitelist.md`.
5. **Payment Gate** - Full letter content remains locked until entitlement/payment permits access. Enforcement is server-side through role-aware version retrieval/truncation; `LetterPaywall.tsx` is the UI blur/CTA layer. See `skills/architectural-patterns/payment_gate.md`.

---

## Documentation Ownership Index

Each piece of information should have one authoritative home. This table maps major topics to their source of truth.

| Topic                                                           | Authoritative File                   | Scope                      |
| --------------------------------------------------------------- | ------------------------------------ | -------------------------- |
| Architecture, tech stack, module map, roles, status machine     | `ARCHITECTURE.md` (this file)        | System-wide reference      |
| Agent behavioral rules, conventions, gotchas                    | `AGENTS.md`                          | AI agent instructions      |
| Architectural pattern enforcement rules                         | `skills/architectural-patterns/*.md` | Per-pattern detailed rules |
| AI pipeline deep-dive (stages, RAG, resilience, n8n, LangGraph) | `docs/PIPELINE_ARCHITECTURE.md`      | Pipeline-specific          |
| Developer workflow, gotchas, conventions, common pitfalls       | `docs/AGENT_GUIDE.md`                | Day-to-day dev reference   |
| Deployment + env-var matrix + account provisioning              | `docs/PRODUCTION_RUNBOOK.md`         | Operations / shipping      |
| Per-role full access matrix                                     | `docs/ROLE_AREA_MATRIX.md`           | Auth / routes              |
| Feature inventory                                               | `docs/FEATURE_MAP.md`                | What has been built        |
| SEO content strategy, blog calendar, keyword map                | `CONTENT-STRATEGY.md`                | Marketing/content          |
| Complete task and bug tracking                                  | `todo.md`                            | Historical task log        |
