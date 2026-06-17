# Dependabot Audit — Run 109 (2026-06-17)

**Date:** 2026-06-17  
**Branch:** `claude/intelligent-gates-77a2qa`  
**Previous run:** Run 108 (PR #275 — 32 PRs assessed, 0 vulns, PR #274 safe to merge)  
**Trigger:** PR #275 opened webhook → scheduled audit session

---

## Executive Summary

| Check | Result |
|-------|--------|
| `pnpm audit` | **0 vulnerabilities** ✅ |
| New patch/minor updates | **0** — fully current after Run 106 ✅ |
| Deferred major versions | **6** — unchanged since Run 71 |
| Native Dependabot PRs | **0** — bot not configured on this repo |
| Open audit-report PRs assessed | **33** (incl. new #275) |
| Merges this run | **0** |

**No code changes required.** Clean audit pass — all packages fully up to date within their pinned major versions.

---

## Security Scan

```
pnpm audit → 0 vulnerabilities ✅
777 dependencies scanned (0 info, 0 low, 0 moderate, 0 high, 0 critical)
```

All 8 CVE overrides remain effective:

| Package | Override Rationale |
|---------|--------------------|
| `esbuild` 0.28.1 | Build-time only, not in production bundle |
| `dompurify` | Patched to 3.4.11 (latest secure release) |
| `brace-expansion` | Transitive only, pinned to 5.0.6 via pnpm override |
| `path-to-regexp` | Transitive; not on user-input routes; pinned to 0.1.13 |
| `form-data` | Transitive; patched via `form-data@<2.5.6: >=2.5.6` override |
| `postcss` | Dev/build-time only; pinned to `>=8.5.10` |
| `qs` | Transitive; no direct usage; pinned to `>=6.15.2` |
| `@opentelemetry/core` | Dev observability; pinned to `>=2.8.0` |

---

## Package Update Status

`pnpm outdated` shows **6 packages** — all known deferred major versions, unchanged since Run 71:

| Package | Current | Latest | Status |
|---------|---------|--------|--------|
| `express` | 4.22.2 | 5.2.1 | ⏸ DEFERRED — 20+ routes need async error-propagation audit |
| `@types/express` | 4.17.21 | 5.0.6 | ⏸ DEFERRED — blocked by express v4→v5 migration |
| `@types/node` | 24.13.1 | 25.9.3 | ⏸ DEFERRED — Node 25 types on Node 22 runtime; incompatible |
| `pnpm` | 10.34.1 | 11.7.0 | ⏸ DEFERRED — requires `pnpm-workspace.yaml` + lockfile migration |
| `puppeteer` | 24.43.1 | 25.1.0 | ⏸ DEFERRED — v25 ESM-only; `executablePath()` goes async |
| `typescript` | 5.9.3 | 6.0.3 | ⏸ DEFERRED — 9 documented breaking changes; requires dedicated migration |

Each deferred package requires a dedicated migration branch with full test coverage. None are candidates for routine audit merges.

---

## PR Decision Table — All 33 Open Audit PRs

| PR | Run | Decision | Reasoning |
|----|-----|----------|-----------|
| #275 | Run 108 | ✅ **SAFE TO MERGE** | Docs-only (Run 107 + 108 reports); 0 code risk; supersedes #274 |
| #274 | Run 107 | ⏸ **STALE — leave open** | Superseded by #275 |
| #265 | Run 102 | ⏸ **STALE — leave open** | Pure report, superseded |
| #263 | Run 101 | ⏸ **STALE — leave open** | Pure report, superseded |
| #260 | Run 99 | ⏸ **STALE — leave open** | Pure report, superseded |
| #258 | Run 98 | ⏸ **STALE — leave open** | Merges confirmed, superseded |
| #254 | Run 96 | ⏸ **STALE — leave open** | Updates in main via Run 106, superseded |
| #251 | Run 94 | ⏸ **STALE — leave open** | Pure report, superseded |
| #250 | Run 93 | ⏸ **STALE — leave open** | Pure report, superseded |
| #249 | Run 92 | ⏸ **STALE — leave open** | Pure report, superseded |
| #248 | Run 91 | ⏸ **STALE — leave open** | form-data merge confirmed, superseded |
| #247 | Run 90 | ⏸ **STALE — leave open** | Pure report, superseded |
| #246 | Run 89 | ⏸ **STALE — leave open** | Pure report, superseded |
| #245 | Run 88 | ⏸ **STALE — leave open** | Pure report, superseded |
| #243 | Run 86 | ⏸ **STALE — leave open** | CVE fix confirmed in main, superseded |
| #242 | Run 85 | ⏸ **STALE — leave open** | Superseded by this run |
| #241 | Run 84 | ⏸ **STALE — leave open** | Pure report, superseded |
| #240 | Run 83 | ⏸ **STALE — leave open** | Pure report, superseded |
| #239 | Run 82 | ⏸ **STALE — leave open** | Upgrades already in main, superseded |
| #238 | Run 81 | ⏸ **STALE — leave open** | EOL fix applied, superseded |
| #234 | Run 79 | ⏸ **STALE — leave open** | Pure report, superseded |
| #233 | Run 78 | ⏸ **STALE — leave open** | Pure report, superseded |
| #232 | Run 77 | ⏸ **STALE — leave open** | Pure report, superseded |
| #231 | Run 76 | ⏸ **STALE — leave open** | Pure report, superseded |
| #230 | Run 75 | ⏸ **STALE — leave open** | Pure report, superseded |
| #229 | Run 74 | ⏸ **STALE — leave open** | Pure report, superseded |
| #228 | Run 73 | ⏸ **STALE — leave open** | Pure report, superseded |
| #226 | Run 71 | ⏸ **STALE — leave open** | pg-boss patch applied, superseded |
| #202 | Run 58 | ⏸ **STALE — leave open** | @types/node managed, superseded |
| #201 | Run 57 | ⏸ **STALE — leave open** | Superseded by 50+ later runs |
| #196 | Run 64 | ⏸ **STALE — leave open** | Risk notes absorbed into deferred list |
| #195 | Run 63 | ⏸ **STALE — leave open** | wouter is current, superseded |
| #194 | Run 62 | ⏸ **STALE — leave open** | Superseded by 46+ later runs |

**Owner action recommended:** Bulk-close stale audit PRs #194–#274 — all are docs-only, superseded by later runs. Only PR #275 warrants merging.

---

## Deferred Major Versions — Migration Notes

### `express` 4 → 5
- **Scope:** All 20+ route handlers in `server/routers/` and REST routes in `server/_core/index.ts`
- **Breaking change:** Async errors no longer need `.catch(next)` wrappers — but existing synchronous error handlers may need refactoring
- **Action:** Create `feature/express-v5-migration` branch, update routes one module at a time, run full `pnpm test`

### `typescript` 5 → 6
- **9 documented breaking changes** include stricter generic inference, `moduleResolution: bundler` behavior changes, and decorator metadata changes
- **Action:** Requires careful `tsc --noEmit` review after upgrade; create dedicated migration branch

### `puppeteer` 24 → 25
- **ESM-only** in v25; `executablePath()` becomes async
- **Affected:** `server/draftPdfRoute.ts` and any Puppeteer calls in PDF generation
- **Action:** Update all `executablePath()` call sites to `await`, verify PDF generation e2e

### `pnpm` 10 → 11
- **Requires** `pnpm-workspace.yaml` if not present; lockfile format change
- **Action:** Test on a clean clone; verify `pnpm install` and `pnpm build` succeed

### `@types/node` 24 → 25 and `@types/express` 4 → 5
- Both blocked by their respective runtime/framework upgrades above

---

## Files Changed This Run

- `docs/DEPENDABOT_AUDIT_RUN_109_2026-06-17.md` — this report

## No Code Changes

This is a documentation-only PR. `pnpm audit` is clean and all packages are current within their pinned major versions.
