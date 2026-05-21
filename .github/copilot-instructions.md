# GitHub Copilot Instructions — Talk to My Lawyer

This repository is `ttml-app`, the Talk to My Lawyer platform.

`AGENTS.md` is the canonical source of truth for coding agents. If this file conflicts with `AGENTS.md`, follow `AGENTS.md` and update this file.

Read these before non-trivial changes:

- `AGENTS.md` — current stack, repo conventions, commands, env vars, deployment, gotchas
- `ARCHITECTURE.md` — architecture, module map, schema, status machine
- `docs/AGENT_GUIDE.md` — developer workflow and pitfalls
- `docs/PIPELINE_ARCHITECTURE.md` — AI pipeline details
- `docs/PRODUCTION_RUNBOOK.md` — deployment and env matrix

## Current Stack

- Node.js `>=22.12.0`
- pnpm `>=10.4.1`
- React 19 + Vite 8 + TypeScript 5.9
- Tailwind CSS v4 using `client/src/index.css`; no `tailwind.config.js`
- shadcn/ui, wouter, TanStack Query v5
- Express 4 + tRPC 11 backend
- PostgreSQL/Supabase + Drizzle ORM
- pg-boss for worker queues
- Stripe, Resend, Cloudflare R2, Sentry
- Railway deployment using one Docker image for web, worker, and migrate services

## Commands

```bash
pnpm install
pnpm dev
pnpm check
pnpm test
pnpm build
pnpm revalidate
pnpm test:e2e
pnpm db:push
pnpm db:check-migrations
pnpm format
```

Validation gate before PR-level completion:

```bash
pnpm revalidate
```

`pnpm revalidate` is the preferred PR gate. It runs type checking, Vitest, and a Vite production build.

## Non-Negotiable Architecture Rules

- Do not create REST endpoints when tRPC already covers the use case.
- Do not write raw Drizzle queries inside routers. Use `server/db/` data-access modules.
- Do not hardcode letter status strings. Import status constants/types from `shared/types/letter.ts` or `drizzle/schema/constants.ts`.
- Do not skip the letter status machine except through explicit super-admin paths that already exist.
- Do not modify `package.json`, `vite.config.ts`, `tsconfig.json`, or `drizzle.config.ts` without explicit user approval.
- Do not add a Vite proxy.
- Do not expose server-only env vars to frontend code.
- Do not make major refactors when a small, localized fix is enough.
- Keep working behavior intact; preserve existing conventions unless the task explicitly asks to change them.

## Frontend Rules

- Routing uses `wouter`, not React Router.
- New pages must be registered in `client/src/App.tsx`.
- `useAuth` lives at `client/src/_core/hooks/useAuth.ts`.
- Frontend env vars must start with `VITE_` and be accessed through `import.meta.env.VITE_*`.
- TanStack Query v5 uses object syntax only.
- tRPC queries should use the generated tRPC hooks; do not add custom query functions unless there is a proven need.
- Every interactive element should have a `data-testid`.
- Tailwind v4 theme configuration lives in `client/src/index.css`; colors should follow the project’s OKLCH convention.
- Use existing shadcn/ui components from `client/src/components/ui/` before creating new primitives.

## Backend Rules

- Use tRPC procedure guards for RBAC. Never rely on client-side role checks.
- Admin routes require admin 2FA.
- Super-admin behavior is restricted to the existing hard-coded owner whitelist.
- All DB operations go through `server/db/`.
- Use Pino logger merge-object first: `logger.error({ err }, "message")`.
- Pipeline work should be queued/handled by the worker unless the existing mode explicitly supports inline execution.
- Stripe webhooks must preserve raw-body verification.
- Supabase service-role keys are server-only.

## AI Pipeline Rules

- Treat the letter generation and attorney review pipeline as protected production-critical code.
- Read `docs/PIPELINE_ARCHITECTURE.md` before editing pipeline files.
- Do not call pipeline stages directly from routers.
- Do not remove attorney review requirements.
- Do not make n8n primary unless explicitly requested and tested; current canonical guidance is in `AGENTS.md`.
- Preserve anti-hallucination, citation, vetting, and status-transition safeguards.

## Pricing Rules

- `shared/pricing.ts` is the single source of truth for pricing.
- Do not hardcode public prices in components, routers, or tests unless a test is intentionally asserting the canonical pricing object.
- Attorney review must remain explicitly included in paid letter flows.

## Testing

- Unit/integration tests use Vitest.
- E2E tests use Playwright.
- Run `pnpm check` before `pnpm test` when changing TypeScript-heavy code.
- Run `pnpm revalidate` before considering PR work complete.

## Documentation Boundaries

- Use this file for concise Copilot coding rules only.
- Use `AGENTS.md` for canonical implementation guidance.
- Use `docs/BRAND_CONTEXT.md` for product/marketing positioning.
- Do not place stale Replit-era setup, outdated Node versions, or marketing/retrieval prompts in this file.
