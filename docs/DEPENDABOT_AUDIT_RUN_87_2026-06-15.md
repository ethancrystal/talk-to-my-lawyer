# Dependabot Audit — Run 87 (2026-06-15)

## Executive Summary

| Metric | Value |
|--------|-------|
| Native Dependabot PRs | 0 |
| Vulnerabilities | **0** (775 deps scanned) |
| TypeScript errors | **0** |
| Packages updated this run | 0 |
| Packages deferred | 7 (unchanged since Run 71) |
| Open audit report PRs | 45 (all stale — see cleanup section) |

---

## Security Posture ✅

```
pnpm audit    → 0 vulnerabilities (775 dependencies scanned)
tsc --noEmit  → 0 errors
```

### Active CVE Overrides (all confirmed effective)

| Override | Package | CVE / Advisory | Severity |
|----------|---------|---------------|----------|
| `esbuild: 0.28.1` | esbuild | GHSA-67mh-4wv8-2f99 | HIGH |
| `dompurify@<=3.3.3: >=3.4.0` | dompurify | XSS | HIGH |
| `brace-expansion: 5.0.6` | brace-expansion | ReDoS | HIGH |
| `path-to-regexp: 0.1.13` | path-to-regexp | Backtrack ReDos | HIGH |
| `form-data@<2.5.6: >=2.5.6` | form-data | GHSA-hmw2-7cc7-3qxx CRLF injection | **HIGH** (fixed Run 86) |
| `postcss@<8.5.10: >=8.5.10` | postcss | Prototype pollution | MODERATE |
| `qs: >=6.15.2` | qs | Prototype pollution | MODERATE |

---

## Native Dependabot PRs — Assessment

**Result: 0 native Dependabot PRs found.**

No GitHub Dependabot bot PRs exist in the repository. All dependency management is performed via these scheduled Claude audit sessions.

**Recommendation:** Enable native Dependabot via `.github/dependabot.yml` (config ready in `docs/DEPENDABOT_AUDIT_RUN_86_2026-06-15.md`) to get automatic patch-level PRs.

---

## Dependency Versions — Current State

All key packages are at their latest safe versions:

| Package | Version | Status |
|---------|---------|--------|
| `@anthropic-ai/sdk` | 0.104.2 | ✅ Latest |
| `@sentry/node` | 10.58.0 | ✅ Latest |
| `@sentry/react` | 10.58.0 | ✅ Latest |
| `@supabase/supabase-js` | 2.108.2 | ✅ Latest |
| `@playwright/test` | 1.61.0 | ✅ Latest |
| `vitest` | 4.1.9 | ✅ Latest |
| `@vitest/coverage-v8` | 4.1.9 | ✅ Latest |

Note: `@anthropic-ai/sdk@0.103.0` also appears in the lockfile as a peer dependency resolution for `@langchain/anthropic`. Both versions coexist correctly — the direct project dependency is 0.104.2.

---

## Deferred Packages (7 — stable policy since Run 71)

| Package | Current | Latest | Reason Deferred |
|---------|---------|--------|-----------------|
| `wouter` | 3.7.1 | 3.10.0 | `pnpm.patchedDependencies` targets `3.7.1` exactly — patch must be ported |
| `@types/express` | 4.17.21 | 5.0.6 | Blocked by Express v5 deferral |
| `@types/node` | 24.13.1 | 25.9.3 | Node 25 types on Node 22 runtime → false-positive TS errors; pinned `^24.x` |
| `express` | 4.22.2 | 5.2.1 | 20+ REST routes need async error-propagation audit for v5 |
| `pnpm` | 10.34.1 | 11.7.0 | v11 requires `pnpm-workspace.yaml`; breaks lockfile format |
| `puppeteer` | 24.43.1 | 25.1.0 | v25 ESM-only; `executablePath()` becomes async |
| `typescript` | 5.9.3 | 6.0.3 | 9 documented breaking changes; needs dedicated migration branch |

---

## Open Audit PRs — Decision Log

### PR #243 — Audit Run 86 (code changes)
- **Status:** Open, CI neutral, 3 commits ahead of main
- **Contents:** form-data HIGH CVE override + 7 package bumps
- **Decision:** ✅ **SAFE TO MERGE** — all patch/minor, 0 TS errors, 0 vulns post-merge
- **Note:** This branch (`claude/intelligent-gates-56xg1h`) includes all Run 86 changes

### PRs #177–#242 (all report-only PRs except #243)
- **Status:** Open, all stale
- **Decision:** ⏸️ **LEAVE UNMERGED / CLOSE** — doc-only historical records; no code impact

---

## Cleanup Recommendations

Close the following stale audit PRs (no code changes, superseded by PR #243 + this PR):

- Runs 53–85: PRs #177–#242 (except #243)
- These are report-only PRs; closing them reduces PR noise

---

## Files in This PR

| File | Change |
|------|--------|
| `package.json` | form-data override + 7 pkg bumps (from Run 86) |
| `pnpm-lock.yaml` | Lockfile updated (from Run 86) |
| `docs/DEPENDABOT_AUDIT_RUN_86_2026-06-15.md` | Run 86 audit record |
| `docs/DEPENDABOT_AUDIT_RUN_87_2026-06-15.md` | This file |
