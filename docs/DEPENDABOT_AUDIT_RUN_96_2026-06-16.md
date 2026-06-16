# Dependabot Audit — Run 96 (2026-06-16)

## Executive Summary

| Metric | Value |
|--------|-------|
| Native Dependabot PRs | 0 |
| Vulnerabilities (pre-run) | **1** MODERATE (CVE-2026-54285) |
| Vulnerabilities (post-run) | **0** ✅ |
| TypeScript errors | **0** |
| PRs merged this run | **2** (security fix + wouter upgrade) |
| Packages deferred | **6** (wouter resolved — down from 7) |
| Open audit report PRs | 50 (all superseded — safe to bulk-close) |

---

## Security Posture ✅

```
pnpm audit (pre-run)  → 1 MODERATE vulnerability (CVE-2026-54285, @opentelemetry/core@2.7.1)
pnpm audit (post-run) → 0 vulnerabilities ✅
tsc --noEmit          → 0 errors ✅
```

### Active CVE Overrides (all confirmed effective)

| Override | Package | CVE / Advisory | Severity | Added |
|----------|---------|---------------|----------|-------|
| `@opentelemetry/core@<2.8.0: >=2.8.0` | @opentelemetry/core | GHSA-8988-4f7v-96qf / CVE-2026-54285 | **MODERATE** | Run 95 / this run |
| `esbuild: 0.28.1` | esbuild | GHSA-67mh-4wv8-2f99 | HIGH | Run 62 |
| `dompurify@<=3.3.3: >=3.4.0` | dompurify | XSS | HIGH | prior |
| `brace-expansion: 5.0.6` | brace-expansion | ReDoS | HIGH | prior |
| `path-to-regexp: 0.1.13` | path-to-regexp | Backtrack ReDoS | HIGH | prior |
| `form-data@<2.5.6: >=2.5.6` | form-data | GHSA-hmw2-7cc7-3qxx CRLF injection | HIGH | Run 86 (merged PR #244) |
| `postcss@<8.5.10: >=8.5.10` | postcss | Prototype pollution | MODERATE | prior |
| `qs: >=6.15.2` | qs | Prototype pollution | MODERATE | prior |

---

## Native Dependabot PRs — Assessment

**Result: 0 native Dependabot PRs found.**

No GitHub Dependabot bot PRs exist in the repository. All dependency management is performed via these scheduled Claude audit sessions.

**Recommendation:** Enable native Dependabot via `.github/dependabot.yml` (config ready in `docs/DEPENDABOT_AUDIT_RUN_86_2026-06-15.md`).

---

## PRs Merged This Run

### PR #252 — CVE-2026-54285 Patch (`@opentelemetry/core`) ✅ MERGED

| Field | Value |
|-------|-------|
| Advisory | GHSA-8988-4f7v-96qf / CVE-2026-54285 |
| Severity | MODERATE |
| Affected package | `@opentelemetry/core@2.7.1` (transitive) |
| Transitive path | `@langchain/anthropic` → `langsmith` → `@opentelemetry/sdk-trace-base` → `@opentelemetry/core` |
| Fix | pnpm override `@opentelemetry/core@<2.8.0: >=2.8.0` |
| Vulnerability | Unbounded memory allocation in W3C Baggage propagation |
| Decision | **MERGED** — minimal-impact pnpm override, consistent with prior CVE fix approach, security improvement |

### PR #253 — wouter 3.7.1 → 3.10.0 ✅ MERGED

| Field | Value |
|-------|-------|
| Package | `wouter` |
| Change | `3.7.1` → `3.10.0` (pinned → explicit version) |
| Patch removed | `patches/wouter@3.7.1.patch` (injected `window.__WOUTER_ROUTES__` — never read anywhere in codebase) |
| New features (additive only) | View Transitions API (`aroundNav`/`transition` props), SSR hydration mismatch fix, `data:` protocol support in `navigate()` |
| Breaking changes | None — `Link`, `useLocation`, `useRoute`, `Switch` usage unaffected |
| TypeScript check | ✅ clean (verified in PR) |
| Decision | **MERGED** — all changes additive, dead-code patch removed, resolves long-standing wouter deferral |

---

## Deferred Packages (6 — down from 7 after wouter resolved)

| Package | Current | Latest | Reason Deferred |
|---------|---------|--------|-----------------|
| `@types/express` | 4.17.21 | 5.0.6 | Blocked by Express v5 deferral (types follow runtime) |
| `@types/node` | 24.13.1 | 25.9.3 | Node 25 types on Node 22 runtime → false-positive TS errors; pinned `^24.x` |
| `express` | 4.22.1 | 5.2.1 | 20+ REST routes need async error-propagation audit for v5 |
| `pnpm` | 10.30.3 | 11.7.0 | v11 requires `pnpm-workspace.yaml`; breaks lockfile format |
| `puppeteer` | 24.43.1 | 25.1.0 | v25 ESM-only; `executablePath()` becomes async |
| `typescript` | 5.9.3 | 6.0.3 | 9 documented breaking changes; needs dedicated migration branch |

---

## Key Package Status

| Package | Installed | Notes |
|---------|-----------|-------|
| `wouter` | **3.10.0** | ✅ Upgraded this run |
| `@opentelemetry/core` | >=2.8.0 (overridden) | ✅ CVE-2026-54285 patched |
| `vitest` | 4.1.9 | ✅ Current |
| `vite` | 8.0.16 | ✅ Current |
| `esbuild` | 0.28.1 | ✅ CVE-pinned |
| `drizzle-orm` | 0.45.2 | ✅ Current |
| `zod` | 4.4.3 | ✅ Current |
| `pg-boss` | 12.19.1 | ✅ Current |
| `openai` | 6.42.0 | ✅ Current |

> **Lockfile lag note:** Several packages (`@anthropic-ai/sdk`, `@langchain/langgraph`, `@trpc/*`, `@sentry/*`, `react`, `stripe`) are within their semver range but behind their wanted versions. A `pnpm install --no-frozen-lockfile` would bring them current with no breaking changes. No security advisories affect these.

---

## Open Audit PRs — Status

50 open PRs are historical Claude audit session records (Runs 1–95), all authored by `moizj00`. All are superseded by this PR. **Safe to bulk-close.** No code changes live only in the open audit PRs — all code changes from prior runs are on `main`.

---

## Action Items

1. ✅ **CVE-2026-54285 fixed** — `@opentelemetry/core` override merged (PR #252)
2. ✅ **wouter upgraded** — 3.7.1 → 3.10.0, dead patch removed (PR #253)
3. **Lockfile refresh** — `pnpm install --no-frozen-lockfile` on `main` to pull packages within semver ranges up to date
4. **Close stale audit PRs** — PRs #122–#251 are documentation-only records, all superseded; safe to bulk-close
5. **Enable native Dependabot** — Add `.github/dependabot.yml` (config in `docs/DEPENDABOT_AUDIT_RUN_86_2026-06-15.md`)
6. **Future migration work** (no CVEs, not urgent):
   - Express v5 migration (unblocks `@types/express` + `express`)
   - TypeScript 6.0 migration (dedicated branch)
   - Puppeteer ESM migration (unblocks v25)
   - pnpm v11 workspace migration
