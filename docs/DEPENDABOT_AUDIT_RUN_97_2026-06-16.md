# Dependabot Audit — Run 97 (2026-06-16)

## Executive Summary

| Metric | Value |
|--------|-------|
| Native Dependabot PRs | 0 |
| Vulnerabilities (pre-run) | **0** ✅ (clean from Run 96) |
| Vulnerabilities (post-run) | **0** ✅ |
| TypeScript errors | **0** |
| PRs merged this run | **1** (Run 96 audit report PR #255) |
| Packages deferred | **6** (unchanged from Run 96) |
| Open audit report PRs | 50 (all superseded — safe to bulk-close) |

---

## Security Posture ✅

```
pnpm audit (pre-run)  → 0 vulnerabilities ✅  (inherited clean state from Run 96)
pnpm audit (post-run) → 0 vulnerabilities ✅
tsc --noEmit          → 0 errors ✅  (verified in Run 96 / PR #252, #253)
```

### Active CVE Overrides (all confirmed effective)

| Override | Package | CVE / Advisory | Severity | Added |
|----------|---------|---------------|----------|-------|
| `@opentelemetry/core@<2.8.0: >=2.8.0` | @opentelemetry/core | GHSA-8988-4f7v-96qf / CVE-2026-54285 | **MODERATE** | Run 96 (PR #252) |
| `esbuild: 0.28.1` | esbuild | GHSA-67mh-4wv8-2f99 | HIGH | Run 62 |
| `dompurify@<=3.3.3: >=3.4.0` | dompurify | XSS | HIGH | prior |
| `brace-expansion: 5.0.6` | brace-expansion | ReDoS | HIGH | prior |
| `path-to-regexp: 0.1.13` | path-to-regexp | Backtrack ReDoS | HIGH | prior |
| `form-data@<2.5.6: >=2.5.6` | form-data | GHSA-hmw2-7cc7-3qxx CRLF injection | HIGH | Run 86 (PR #244) |
| `postcss@<8.5.10: >=8.5.10` | postcss | Prototype pollution | MODERATE | prior |
| `qs: >=6.15.2` | qs | Prototype pollution | MODERATE | prior |

---

## Native Dependabot PRs — Assessment

**Result: 0 native Dependabot PRs found.**

No GitHub Dependabot bot PRs exist in the repository. All dependency management is performed via these scheduled Claude audit sessions. All 50 open PRs are authored by `moizj00` and represent historical audit session records.

**Recommendation:** Enable native Dependabot via `.github/dependabot.yml` (config ready in `docs/DEPENDABOT_AUDIT_RUN_86_2026-06-15.md`).

---

## PRs Merged This Run

### PR #255 — Run 96 Audit Report (`docs/DEPENDABOT_AUDIT_RUN_96_2026-06-16.md`) ✅ MERGED

| Field | Value |
|-------|-------|
| Type | Documentation only (1 file added) |
| CI | Vercel Agent Review → `neutral` (non-blocking) |
| Content | Full audit report for Run 96 (2 PRs merged: CVE fix + wouter upgrade) |
| Decision | **MERGED** — documentation-only, zero risk, captures Run 96 findings for the record |

---

## Run 96 Recap (previously merged PRs — now on `main`)

### PR #252 — CVE-2026-54285 Patch (`@opentelemetry/core`) ✅ on main

| Field | Value |
|-------|-------|
| Advisory | GHSA-8988-4f7v-96qf / CVE-2026-54285 |
| Severity | MODERATE |
| Affected package | `@opentelemetry/core@2.7.1` (transitive via `@langchain/anthropic → langsmith → @opentelemetry/sdk-trace-base`) |
| Fix | pnpm override `@opentelemetry/core@<2.8.0: >=2.8.0` |
| Vulnerability | Unbounded memory allocation in W3C Baggage propagation |
| Decision | **MERGED Run 96** — minimal-impact pnpm override, security improvement |

### PR #253 — wouter 3.7.1 → 3.10.0 ✅ on main

| Field | Value |
|-------|-------|
| Package | `wouter` |
| Change | `3.7.1` → `3.10.0` |
| Patch removed | `patches/wouter@3.7.1.patch` (`window.__WOUTER_ROUTES__` injection — never read anywhere in codebase) |
| New features | View Transitions API, SSR hydration fix, `data:` navigate support (all additive) |
| Breaking changes | None — `Link`, `useLocation`, `useRoute`, `Switch` unaffected |
| Decision | **MERGED Run 96** — additive changes, dead-code patch removed |

---

## Deferred Packages (6 — unchanged from Run 96)

| Package | Installed | Latest | Reason Deferred |
|---------|-----------|--------|-----------------|
| `@types/express` | 4.17.21 | 5.0.6 | Blocked by Express v5 deferral (types follow runtime) |
| `@types/node` | 24.13.1 | 25.9.3 | Node 25 types on Node 22 runtime → false-positive TS errors; pinned `^24.x` |
| `express` | 4.22.2 | 5.2.1 | 20+ REST routes need async error-propagation audit for v5 |
| `pnpm` | 10.4.1 | 11.7.0 | v11 requires `pnpm-workspace.yaml`; breaks lockfile format |
| `puppeteer` | 24.43.1 | 25.1.0 | v25 ESM-only; `executablePath()` becomes async |
| `typescript` | 5.9.3 | 6.0.3 | 9 documented breaking changes; needs dedicated migration branch |

---

## Key Package Status

| Package | Installed | Notes |
|---------|-----------|-------|
| `wouter` | **3.10.0** | ✅ Upgraded Run 96 |
| `@opentelemetry/core` | >=2.8.0 (overridden) | ✅ CVE-2026-54285 patched Run 96 |
| `vitest` | 4.1.9 | ✅ Current |
| `vite` | 8.0.16 | ✅ Current |
| `esbuild` | 0.28.1 | ✅ CVE-pinned |
| `drizzle-orm` | 0.45.2 | ✅ Current |
| `zod` | 4.4.3 | ✅ Current |
| `openai` | 6.42.0 | ✅ Current |
| `typescript` | 5.9.3 | ✅ (v6 deferred) |
| `express` | 4.22.2 | ✅ (v5 deferred) |

> **Lockfile lag note:** Several packages (`@anthropic-ai/sdk`, `@langchain/langgraph`, `@trpc/*`, `@sentry/*`, `react`, `stripe`) are within their semver range but behind their wanted versions. A `pnpm install --no-frozen-lockfile` would bring them current with no breaking changes. No security advisories affect these.

---

## Open Audit PRs — Status

50 open PRs are historical Claude audit session records (Runs 1–96), all authored by `moizj00`. All are superseded by this PR. **Safe to bulk-close.** No code changes live only in the open audit PRs — all code changes from prior runs are on `main`.

---

## Action Items

1. ✅ **CVE-2026-54285 fixed** — `@opentelemetry/core` override (PR #252, Run 96)
2. ✅ **wouter upgraded** — 3.7.1 → 3.10.0, dead patch removed (PR #253, Run 96)
3. ✅ **Run 96 audit report merged** — PR #255 (this run)
4. **Lockfile refresh** — `pnpm install --no-frozen-lockfile` on `main` to pull packages within semver ranges up to date
5. **Close stale audit PRs** — PRs #122–#254 are documentation-only records, all superseded; safe to bulk-close
6. **Enable native Dependabot** — Add `.github/dependabot.yml` (config in `docs/DEPENDABOT_AUDIT_RUN_86_2026-06-15.md`)
7. **Future migration work** (no CVEs, not urgent):
   - Express v5 migration (unblocks `@types/express` + `express`)
   - TypeScript 6.0 migration (dedicated branch)
   - Puppeteer ESM migration (unblocks v25)
   - pnpm v11 workspace migration
