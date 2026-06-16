# Dependabot Audit — Run 102 (2026-06-16)

> **Triggered by:** PR #264 `pull_request.opened` webhook (Run 101). Reviewed all open dependency-audit PRs, performed live `pnpm audit` and `pnpm outdated`, made merge/no-merge decisions.

---

## Security Posture ✅

```
pnpm audit (live)    → 0 vulnerabilities ✅
pnpm outdated        → 6 deferred packages only (nothing new to update) ✅
```

---

## Open PR Decisions This Run

### ✅ PR #264 — Dependabot Audit Run 101 — **MERGED**

| Field | Value |
|-------|-------|
| Branch | `claude/intelligent-gates-r8brwq` |
| Changed files | 2 (`docs/DEPENDABOT_AUDIT_RUN_101_2026-06-16.md`, `docs/DEPENDABOT_AUDIT_RUN_99_2026-06-16.md`) |
| Net change | Docs only — 267 additions |
| CI | Vercel Agent Review: `neutral` (not a failure) |
| Mergeable state | `unstable` (neutral CI only — no blocking issues) |
| Decision | ✅ **MERGED** via squash |
| Reason | Docs-only, 0 vulnerabilities, no code/package.json changes. Same safe pattern as #262 and #261 merged in Run 101. |

### ❌ PRs #258, #254, #251–#191 — **LEFT UNMERGED (stale)**

All older audit-record PRs with branches behind `main`. Code changes from their eras are already reflected in `main`. These are historical records only.

### ⏭️ PRs #197, #216, #235, #237 — **LEFT FOR HUMAN REVIEW (SEO)**

SEO / structured-data changes. Not dependency updates — out of scope for this routine.

---

## Native Dependabot PRs

**None.** GitHub Dependabot is not configured on this repository (no `.github/dependabot.yml`). All dependency management runs through these scheduled Claude audit sessions. Enabling native Dependabot remains an open action item.

---

## New Dependency Updates This Run

**None.** `pnpm outdated` reports only the 6 long-standing deferred packages. All packages within declared `^` semver ranges are at their latest compatible versions.

---

## Full `pnpm outdated` Output

```
Package              Current   Latest    Notes
@types/express       4.17.21   5.0.6     DEFERRED — blocked by Express v5
@types/node          24.13.1   25.9.3    DEFERRED — Node 25 on Node 22 runtime
express              4.22.2    5.2.1     DEFERRED — major breaking change
pnpm                 10.34.1   11.7.0    DEFERRED — lockfile format change
puppeteer            24.43.1   25.1.0    DEFERRED — ESM-only in v25
typescript           5.9.3     6.0.3     DEFERRED — 9 documented breaking changes
```

---

## Deferred Packages (6 — stable policy since Run 71)

| Package | Installed | Latest | Reason for Deferral |
|---------|-----------|--------|---------------------|
| `express` | 4.22.2 | 5.2.1 | **Major** — 20+ routes need async error-propagation audit for v5; `res.json()`/`next(err)` behaviour changed |
| `@types/express` | 4.17.21 | 5.0.6 | Blocked by `express` v5 deferral; types must match runtime |
| `@types/node` | 24.13.1 | 25.9.3 | Node 25 types on Node 22 runtime → false-positive TS errors; upgrade only with Node runtime bump |
| `pnpm` | 10.34.1 | 11.7.0 | v11 requires `pnpm-workspace.yaml` and breaks lockfile format; needs dedicated migration |
| `puppeteer` | 24.43.1 | 25.1.0 | v25 ESM-only; `executablePath()` becomes async; `draftPdfRoute.ts` needs refactor |
| `typescript` | 5.9.3 | 6.0.3 | 9 documented breaking changes (decorators, `isolatedModules`, `module` defaults); needs dedicated migration branch |

---

## Active CVE Overrides — All Confirmed Effective ✅

| Override in `pnpm.overrides` | Advisory | Severity | Status |
|------------------------------|----------|----------|--------|
| `@opentelemetry/core@<2.8.0: >=2.8.0` | CVE-2026-54285 / GHSA-8988-4f7v-96qf | MODERATE | ✅ Effective |
| `esbuild: 0.28.1` (pinned) | GHSA-67mh-4wv8-2f99 | HIGH | ✅ Effective |
| `dompurify@<=3.3.3: >=3.4.0` | XSS via mXSS | HIGH | ✅ Effective |
| `brace-expansion: 5.0.6` | ReDoS | HIGH | ✅ Effective |
| `path-to-regexp: 0.1.13` | Backtrack ReDoS | HIGH | ✅ Effective |
| `form-data@<2.5.6: >=2.5.6` | GHSA-hmw2-7cc7-3qxx (CRLF injection) | HIGH | ✅ Effective |
| `postcss@<8.5.10: >=8.5.10` | Prototype pollution | MODERATE | ✅ Effective |
| `qs: >=6.15.2` | Prototype pollution | MODERATE | ✅ Effective |

---

## Key Packages — Installed vs Latest (spot-check)

| Package | Installed | Latest | Status |
|---------|-----------|--------|--------|
| `@anthropic-ai/sdk` | 0.104.2 | 0.104.2 | ✅ Current |
| `@langchain/langgraph` | 1.4.2 | 1.4.2 | ✅ Current |
| `@langchain/core` | 1.1.49 | 1.1.49 | ✅ Current |
| `@langchain/anthropic` | 1.4.1 | 1.4.1 | ✅ Current |
| `@trpc/server` / `client` / `react-query` | 11.17.0 | 11.17.0 | ✅ Current |
| `@sentry/node` / `@sentry/react` | 10.58.0 | 10.58.0 | ✅ Current |
| `react` / `react-dom` | 19.2.7 | 19.2.7 | ✅ Current |
| `stripe` | 22.2.1 | 22.2.1 | ✅ Current |
| `vitest` | 4.1.9 | 4.1.9 | ✅ Current |
| `vite` | 8.0.16 | 8.0.16 | ✅ Current |
| `esbuild` | 0.28.1 | — | ✅ CVE-pinned |
| `drizzle-orm` | 0.45.2 | 0.45.2 | ✅ Current |
| `zod` | 4.4.3 | 4.4.3 | ✅ Current |
| `pg-boss` | 12.19.1 | 12.19.1 | ✅ Current |
| `openai` | 6.42.0 | 6.42.0 | ✅ Current |
| `ai` | 6.0.206 | 6.0.206 | ✅ Current |
| `wouter` | 3.10.0 | 3.10.0 | ✅ Current |

---

## `@anthropic-ai/sdk` Multi-Instance Resolution — Not a Bug

```
@anthropic-ai/sdk 0.104.2            ← direct dep ✅
@langchain/anthropic 1.4.1
└── @anthropic-ai/sdk 0.103.0        ← nested, @langchain/anthropic pins this version
```

Normal pnpm multi-instance resolution. No action needed.

---

## Action Items

- [x] **PR #264 merged** — Run 101 docs safely landed in `main`
- [x] **0 vulnerabilities** — all 8 CVE overrides confirmed effective
- [x] **`pnpm outdated`** — only the 6 known deferred packages; no new updates
- [ ] **Bulk-close stale audit PRs** — #191–#263 (excluding SEO PRs #197/#216/#235/#237)
- [ ] **Enable native Dependabot** — add `.github/dependabot.yml` to eliminate the need for these scheduled Claude sessions
- [ ] **Future migrations** (no CVEs, not urgent):
  - Express v5 (unblocks `express` + `@types/express`)
  - TypeScript 6.0 (dedicated migration branch)
  - Puppeteer v25 ESM migration (`draftPdfRoute.ts` refactor)
  - pnpm v11 workspace migration

---

_Generated by Claude Code — Dependabot Audit Run 102 (2026-06-16)_
