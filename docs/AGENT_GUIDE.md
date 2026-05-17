# TTML Agent Guide — Developer Workflow & Gotchas

> **Last updated:** May 17, 2026
> **Status:** Canonical for developer workflow (module-move checklist, refactor map, common pitfalls, testing, security)
> **For invariants and the always-loaded gotcha list:** [`CLAUDE.md`](../CLAUDE.md)
> **For tech stack / status machine / module map / DB schema / router table:** [`ARCHITECTURE.md`](../ARCHITECTURE.md)
> **For env vars + deployment matrix:** [`docs/PRODUCTION_RUNBOOK.md`](PRODUCTION_RUNBOOK.md)

---

## 1. CRITICAL GOTCHAS — READ THESE FIRST

### 1.1 DO NOT MODIFY THESE FILES (unless absolutely necessary)
- `package.json` — ask user before changing scripts. Use packager tool for dependencies.
- `vite.config.ts` — aliases, chunks, and plugins are pre-configured. Do NOT add a proxy.
- `server/_core/vite.ts` — handles dev/prod server integration.
- `drizzle.config.ts` — pre-configured for Supabase PostgreSQL.
- `tsconfig.json` — path aliases are set.

Rationale for each: aliases/chunks/plugins are pre-configured (don't add a Vite proxy), `_core/vite.ts` handles dev↔prod server integration, `drizzle.config.ts` reads `SUPABASE_DATABASE_URL` and converts pooler port 6543 → direct 5432 for migrations.

### 1.2 Path Aliases

| Alias | Resolves to | Where defined |
|-------|------------|---------------|
| `@/*` | `client/src/*` | vite.config.ts, tsconfig.json, components.json |
| `@shared/*` | `shared/*` | vite.config.ts, tsconfig.json |
| `@assets/*` | `attached_assets/*` | vite.config.ts |

Configured identically across `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts` — do not modify in only one.

### 1.3 Conventions — canonical inline in CLAUDE.md

Tailwind v4 (OKLCH, `@theme inline`, no `tailwind.config.js`), tRPC v11 vs REST, TanStack Query v5 object-form, Drizzle `text().array()` and `server/db/` rule, Supabase JWT + 30s sync cache + `useAuth` `_core` path — all canonical inline in [`CLAUDE.md` "Critical Gotchas"](../CLAUDE.md). CLAUDE.md loads into every Claude Code session; read it there, not duplicated here.

**Dev-workflow specifics worth knowing on top of CLAUDE.md:**

- **Status machine, legacy path:** Current submissions go `drafting` → `ai_generation_completed_hidden` (24h hold) → upsell statuses → `pending_review`. `generated_locked` remains in `ALLOWED_TRANSITIONS` as a compatibility path — legacy letters may still appear in it on the way to `pending_review`. Diagram + rules: [`ARCHITECTURE.md` "Status Machine"](../ARCHITECTURE.md#status-machine-letter-lifecycle). Source of truth: [`shared/types/letter.ts`](../shared/types/letter.ts).
- **Drizzle types are inferred:** use `typeof users.$inferSelect` for selects, `$inferInsert` for inserts. Insert validation via `createInsertSchema` from `drizzle-zod` with `.omit({ id: true, createdAt: true })`. Schema files: `drizzle/schema.ts` (barrel), `drizzle/relations.ts`.
- **tRPC mutation invalidation pattern:** import `queryClient` from `@/lib/queryClient`, then `queryClient.invalidateQueries({ queryKey: [...] })` after every mutation. The default fetcher is pre-configured — do NOT define a custom `queryFn` on tRPC queries.

### 1.8 Pricing — Single Source of Truth
All pricing lives in `shared/pricing.ts`. NEVER hardcode prices anywhere.

Active public plans:
- Monthly: $299/month (4 letters)
- Yearly: $2,400/year (8 letters total)

Other constants:
- Paid Revision: $20 (after the first free revision)
- Affiliate discount: 20% (constant `AFFILIATE_DISCOUNT_PERCENT`)
- Stripe amounts are in CENTS (multiply by 100)
- Single Letter ($299 one-time) is `@deprecated` in `shared/pricing.ts` — kept
  for legacy Stripe products and existing customers, NOT shown on the public
  pricing page. Do not reintroduce as a new offering.

### 1.9 Environment Variables
All env vars are accessed through `server/_core/env.ts` → `ENV` object.

> Full env var matrix: [`docs/PRODUCTION_RUNBOOK.md`](PRODUCTION_RUNBOOK.md) §4  
> Quick dev template: [`.env.example`](../.env.example)

### 1.10 Frontend gotchas (not in CLAUDE.md)

CLAUDE.md "Critical Gotchas → Frontend" covers no-`import React`, wouter routing, `lazyRetry` page registration, `VITE_*` env vars, and `data-testid` pattern. On top of those:

- `useToast` is exported from `@/hooks/use-toast` (note the path).
- `<SelectItem>` will throw if `value` is missing or empty — always provide a non-empty `value` prop.
- If a form fails to submit silently, log `form.formState.errors` — most often it's a validation rule that wasn't surfaced.

### 1.11 Rate Limiting

Two layers in [`server/rateLimiter.ts`](../server/rateLimiter.ts) using Upstash Redis:

1. **Express middleware** — Auth endpoints (`/api/auth/login`, `/signup`, `/forgot-password`): 10 req / 15 min, **fail-closed** (denies when Redis is unreachable). General `/api/trpc/*`: 60 req / 1 min, fail-open.
2. **tRPC-level** (`checkTrpcRateLimit`) — Sensitive mutations like `letters.submit`: 5 / hour, fail-open.

If Upstash credentials are missing, the limiter silently degrades (no crash). Auth being fail-closed is deliberate — better to deny logins than to allow brute-force during a Redis outage.

### 1.12 Body Size Limit
Express is configured with `express.json({ limit: "12mb" })` to accommodate large legal document uploads.

### 1.13 Current Refactor Map (Important for Future Agents)
- Subscriber dashboard page is intentionally thin: `client/src/pages/subscriber/Dashboard.tsx`.
- Dashboard UI logic belongs in `client/src/components/subscriber/dashboard/*`.
- Subscriber letter detail page is intentionally thin: `client/src/pages/subscriber/LetterDetail.tsx`.
- Letter detail UI logic belongs in `client/src/components/subscriber/letter-detail/*`.
- Admin tRPC router is modularized at `server/routers/admin/index.ts` and composed from `server/routers/admin/{letters,users,jobs,learning}.ts`.
- Pipeline entry is `server/pipeline/orchestrator.ts`; stage-specific orchestration logic is split into `server/pipeline/orchestration/`, `server/pipeline/research/`, and `server/pipeline/vetting/`.

**GOTCHA:** Do not reintroduce monolithic page/router files unless explicitly requested by the user.

### 1.14 Module Move Checklist

Whenever you move `pipeline/foo.ts` → `pipeline/foo/index.ts` (or any equivalent file → folder/index.ts move), every relative import inside the moved file shifts one level deeper. Skipping this step has historically broken whole test suites.

Before declaring the move complete:

1. **Repath every relative import inside the moved file:**
   - Sibling becomes parent: `from "./shared"` → `from "../shared"`
   - Parent becomes grandparent: `from "../db"` → `from "../../db"`
   - Re-exports and dynamic imports follow the same rule.
2. **Repath the children too** if you also extracted helpers.
3. **Update any test that reads the file via `fs`:** grep for the old relative path in `server/**/*.test.ts`.
4. **Re-export shared types from the moved module** rather than from `shared/types` if they're pipeline-internal.
5. **Run `pnpm check` *before* `pnpm test`.** `tsc --noEmit` will surface stale paths instantly.

When extracting a sub-component out of a large React page (`pages/foo/Bar.tsx` → `components/.../Bar/*.tsx`), the same idea applies plus two extras:

- **Pick one canonical subtree** — never end up with the same logical area split across `pages/<name>/...` AND `components/<name>/...`. Per the Refactor Map above, `components/subscriber/<name>/` is canonical.
- **Match the existing hook contracts.** `useStaggerReveal(itemCount, staggerMs?)` returns `boolean[]`; `staggerStyle(index, visible)` requires both args.

---

## 2. STYLING CONVENTIONS

- Tailwind CSS v4 with OKLCH colors defined in `client/src/index.css`
- shadcn/ui components (Radix UI based) in `client/src/components/ui/`
- Component variants via `class-variance-authority` (CVA)
- Dark mode: `darkMode: ["class"]` approach, toggled via `ThemeContext.tsx`
- Always use explicit `dark:` variants for visual properties when not using utility classes from config
- Icons: `lucide-react` for actions, `react-icons/si` for company logos
- Animations: extensive custom keyframes in index.css (`animate-page-enter`, `hero-card-float`, `skeleton-crossfade`)

---

## 3. KEY WORKFLOWS & BUSINESS LOGIC

### Letter Submission Flow
1. Subscriber fills multi-step intake form (`/submit`)
2. Server validates and normalizes intake data (`server/intake-normalizer.ts`)
3. Pipeline starts (4 stages) — subscriber sees real-time progress
4. On completion, letter typically enters `ai_generation_completed_hidden` (24h visibility hold)
5. After hold expiry, subscriber-visible statuses proceed through `letter_released_to_subscriber` and upsell/payment statuses
6. Checkout/payment transitions letter to `pending_review`
7. Letter appears in Attorney Review Queue
8. Attorney claims it → `under_review`
9. Attorney edits in Tiptap, submits → `approved` (transient) → `client_approval_pending`
10. Subscriber reviews, approves → `client_approved` (PDF generated) → `sent`
11. OR subscriber requests revision (first free, then $20 each) → `client_revision_requested` → `pending_review`
12. Server generates branded PDF and sends delivery email

> Full pipeline architecture: [`docs/PIPELINE_ARCHITECTURE.md`](PIPELINE_ARCHITECTURE.md)

### Recursive Learning System
- When attorneys edit AI drafts, the system extracts "lessons" (`server/learning/`)
- Lessons are stored in `pipeline_lessons` table with jurisdiction + letter type tags
- Future pipeline runs query active lessons and inject them into AI prompts
- Admin manages lessons at `/admin/learning`

### Affiliate System
- Employees get unique discount codes
- Subscribers can apply codes at checkout for 20% off
- Employee earns commission per code usage
- Tracked in `commission_ledger`, payouts via `payout_requests`

---

## 4. COMMON PITFALLS FOR AGENTS

1. **Don't create a new REST endpoint when tRPC already covers it.** Almost everything goes through tRPC. Only add REST for webhooks, streaming, or external callbacks.

2. **Don't skip the storage/db layer.** All DB operations go through `server/db/`. Never write raw Drizzle queries in routers.

3. **Don't hardcode status strings.** Import from `shared/types/letter.ts` → `ALLOWED_TRANSITIONS` or `STATUS_CONFIG`.

4. **Don't forget cache invalidation after mutations.** Every tRPC mutation that changes data must call `queryClient.invalidateQueries()` with the right key.

5. **Don't put non-VITE_ env vars in frontend code.** Only `VITE_` prefixed vars are available via `import.meta.env`.

6. **Don't use `array(text())` in Drizzle.** Use `text().array()` — method call, not wrapper.

7. **Don't modify the Vite proxy/config.** It handles everything. Adding a proxy will break things.

8. **Don't skip intake normalization.** All user intake data passes through `server/intake-normalizer.ts` before entering the pipeline.

9. **Don't create new pages without adding them to `App.tsx`.** Wouter routes must be registered.

10. **Don't forget `data-testid` on interactive elements.** Pattern: `{action}-{target}` or `{type}-{content}-{id}`.

11. **Don't use HSL in index.css theme vars.** Use space-separated `H S% L%` without `hsl()`.

12. **The `useAuth` hook is at `client/src/_core/hooks/useAuth.ts`.** Not `client/src/hooks/useAuth.ts`.

13. **Supabase client is initialized in `client/src/lib/supabase.ts`.** It reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

14. **tRPC client type is imported from server.** `client/src/lib/trpc.ts` imports `AppRouter` type directly from the server for end-to-end type safety.

15. **Manual chunks in Vite config.** Heavy libraries (Tiptap, Stripe, Supabase, Radix, PDFKit) are split into separate vendor bundles. Don't duplicate this.

16. **The server runs on a single port.** Express serves both the API and Vite (dev) / static files (prod). There is no separate frontend server.

17. **Superjson is the tRPC serializer.** Dates and other complex types are handled automatically.

18. **The pipeline worker is separate from the API.** `server/worker.ts` handles the pg-boss queue. Don't call pipeline stages manually from routers.

19. **PDF generation happens on subscriber approval.** `generateAndUploadApprovedPdf` is triggered when the subscriber approves the attorney's submitted draft (`clientApprove` mutation) — not when the attorney submits it.

20. **Supabase Realtime is used for live pipeline progress.** The `useLetterRealtime` hook subscribes to letter status changes.

---

## 5. TESTING

- Test files are in `server/` with `.test.ts` extension (phase-numbered: `phase23.test.ts`, `phase67-pricing.test.ts`, etc.)
- Test runner: Vitest (config at `vitest.config.ts`)
- Always add `data-testid` to new UI elements for E2E testing
- Test reports are in `test_reports/`

### Test Credentials

Four seeded accounts at `@ttml.dev`, password `TestPass123!`:

| Role | Email |
|---|---|
| subscriber | `test-subscriber@ttml.dev` |
| employee | `test-employee@ttml.dev` |
| attorney | `test-attorney@ttml.dev` |
| admin | `test-admin@ttml.dev` |

The seed script (`scripts/seed-test-users.ts`) is idempotent — safe to run repeatedly. It resets passwords and upserts DB records on each run.

### Route Protection (ProtectedRoute)

The `ProtectedRoute` component enforces RBAC on all protected routes:
- **Unauthenticated** → redirects to `/login?next=<returnPath>`
- **Email unverified** (non-admin) → redirects to `/verify-email`
- **Admin without 2FA cookie** → redirects to `/admin/verify`
- **Wrong role** → redirects to user's own role dashboard (via `getRoleDashboard()`)

---

## 6. SECURITY NOTES

- Stripe webhooks verified via `stripe.webhooks.constructEvent` with the webhook secret
- n8n callbacks verified via `timingSafeEqual` with `N8N_CALLBACK_SECRET`
- Admin 2FA uses signed cookies with expiration
- Rate limiting on auth (10/15min) and general API (60/min)
- Express body limit is 12MB
- CORS, CSP, HSTS, XSS protection headers set in server middleware
- Supabase RLS policies protect database-level access

Security headers (X-Frame-Options DENY, X-Content-Type-Options nosniff, Strict-Transport-Security in prod, CSP in prod, Permissions-Policy, X-Robots-Tag) are set in [`server/_core/index.ts`](../server/_core/index.ts). CORS allow-list: production domains + `*.railway.app` + `*.replit.dev` + `localhost` (dev) + `CORS_ALLOWED_ORIGINS` env var.

---

For the full file structure and module map, see [`ARCHITECTURE.md`](../ARCHITECTURE.md).
