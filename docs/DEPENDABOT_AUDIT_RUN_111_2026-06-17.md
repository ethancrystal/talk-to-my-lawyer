# Dependabot Audit — Run 111 (2026-06-17)

**Date:** 2026-06-17
**Branch:** `claude/intelligent-gates-l6qbhh`
**Previous run:** Run 110 (PR #277 — merged ✅ — 5 docs files, 0 code risk)
**Trigger:** PR #277 opened webhook → scheduled audit session

---

## Executive Summary

| Check | Result |
|-------|--------|
| `pnpm audit` | **0 vulnerabilities** ✅ |
| Dependencies scanned | **777** |
| New patch/minor updates | **0** — fully current after Run 106 ✅ |
| Deferred major versions | **6** — unchanged since Run 71 |
| Native Dependabot PRs | **0** — bot not configured |
| Open audit-report PRs assessed | **35** (incl. new #277) |
| Merges this run | **1** — PR #277 merged ✅ |
| CVE overrides active | **8** — all effective |

**Status: Clean pass with 1 merge.** PR #277 (Run 110) merged as docs-only. No code changes required. No new vulnerabilities.

---

## Merge Action — PR #277

**Decision: MERGED** ✅

- **What:** Audit Run 110 report — 5 markdown files added under `docs/` (Run 107, 108, 109, 110 reports + review session)
- **Why safe:** Docs-only (0 source code changes, 0 `package.json`/`pnpm-lock.yaml` changes)
- **Vercel check:** Neutral (completed) — no deployment risk
- **Squash commit:** `4872658129099c7267c1fb3963f238f2b890848a`

---

## Security Scan

```
pnpm audit → 0 vulnerabilities ✅
777 dependencies scanned (0 info, 0 low, 0 moderate, 0 high, 0 critical)
```

### Active CVE Overrides (8 — all effective)

| Package | CVE / Advisory | Override Type | Status |
|---------|---------------|---------------|--------|
| `esbuild` 0.28.1 | GHSA-67mh-4wv8-2f99 | `.npmrc` override | ✅ Effective |
| `dompurify` 3.4.11 | GHSA-mmhx-hmjr-r674 | Patched via upgrade (Run 39) | ✅ Effective |
| `brace-expansion` | GHSA-jxxr-2hdx-vj6h | `pnpm.overrides` pin ≥5.0.6 | ✅ Effective |
| `path-to-regexp` | GHSA-rhx6-c78j-4q9w | `pnpm.overrides` pin 0.1.13 | ✅ Effective |
| `form-data` | GHSA-fjvf-q6vc-5p99 | Patched via Run 86 / PR #244 | ✅ Effective |
| `postcss` | GHSA postcss | `pnpm.overrides` ≥8.5.10 | ✅ Effective |
| `qs` | GHSA-qrpm-qs22 | `pnpm.overrides` ≥6.15.2 | ✅ Effective |
| `@opentelemetry/core` | GHSA otel | `pnpm.overrides` ≥2.8.0 | ✅ Effective |

No new advisories introduced.

---

## Package Update Status

`pnpm outdated` shows **6 packages** — all known deferred major versions, unchanged since Run 71:

| Package | Current | Latest | Decision |
|---------|---------|--------|----------|
| `express` | 4.22.2 | 5.2.1 | ⏸ **DEFERRED** — 20+ routes need async error-propagation audit |
| `@types/express` | 4.17.21 | 5.0.6 | ⏸ **DEFERRED** — blocked by express v4→v5 migration |
| `@types/node` | 24.13.1 | 25.9.3 | ⏸ **DEFERRED** — Node 25 types on Node 22 runtime; incompatible |
| `pnpm` | 10.34.1 | 11.7.0 | ⏸ **DEFERRED** — requires `pnpm-workspace.yaml` + lockfile migration |
| `puppeteer` | 24.43.1 | 25.1.0 | ⏸ **DEFERRED** — v25 ESM-only; `executablePath()` goes async |
| `typescript` | 5.9.3 | 6.0.3 | ⏸ **DEFERRED** — 9 documented breaking changes; requires dedicated migration |

All patch/minor packages are fully current following Run 106's 16-package upgrade.

---

## PR Decision Table — All 35 Open Audit PRs

| PR | Run | Decision | Reasoning |
|----|-----|----------|-----------|
| **#277** (Run 110) | 110 | ✅ **MERGED** | Docs-only (5 markdown files); 0 code risk; Vercel neutral |
| #276 (Run 109) | 109 | ⏸ **STALE** | Superseded by #277 (which contains all #276 content + more) |
| #275 (Run 108) | 108 | ⏸ **STALE** | Superseded by #276 and #277 |
| #274 (Run 107) | 107 | ⏸ **STALE** | Superseded by #275–#277 |
| #273 (Review session) | — | ⏸ **STALE** | Superseded by later runs |
| #265 (Run 102) | 102 | ⏸ **STALE** | Pure report; all updates applied via Run 106 |
| #263 (Run 101) | 101 | ⏸ **STALE** | Pure report; superseded |
| #260 (Run 99) | 99 | ⏸ **STALE** | Pure report; superseded |
| #258 (Run 98) | 98 | ⏸ **STALE** | Merge records confirmed in main |
| #254 (Run 96) | 96 | ⏸ **STALE** | 15 updates now in main via Run 106 |
| #251 (Run 94) | 94 | ⏸ **STALE** | Pure report; superseded |
| #250 (Run 93) | 93 | ⏸ **STALE** | Pure report; superseded |
| #249 (Run 92) | 92 | ⏸ **STALE** | Pure report; superseded |
| #248 (Run 91) | 91 | ⏸ **STALE** | form-data merge confirmed in main |
| #247 (Run 90) | 90 | ⏸ **STALE** | Pure report; superseded |
| #246 (Run 89) | 89 | ⏸ **STALE** | Pure report; superseded |
| #245 (Run 88) | 88 | ⏸ **STALE** | Pure report; superseded |
| #243 (Run 86) | 86 | ⏸ **STALE** | form-data CVE fix applied in main |
| #242 (Run 85) | 85 | ⏸ **STALE** | Superseded |
| #241 (Run 84) | 84 | ⏸ **STALE** | Pure report; superseded |
| #240 (Run 83) | 83 | ⏸ **STALE** | Pure report; superseded |
| #239 (Run 82) | 82 | ⏸ **STALE** | 7 upgrades applied via Run 106 |
| #238 (Run 81) | 81 | ⏸ **STALE** | claude-sonnet EOL fix applied; superseded |
| #234 (Run 79) | 79 | ⏸ **STALE** | Pure report; superseded |
| #233 (Run 78) | 78 | ⏸ **STALE** | Pure report; superseded |
| #232 (Run 77) | 77 | ⏸ **STALE** | Pure report; superseded |
| #231 (Run 76) | 76 | ⏸ **STALE** | Pure report; superseded |
| #230 (Run 75) | 75 | ⏸ **STALE** | Pure report; superseded |
| #229 (Run 74) | 74 | ⏸ **STALE** | Pure report; superseded |
| #228 (Run 73) | 73 | ⏸ **STALE** | Pure report; superseded |
| #226 (Run 71) | 71 | ⏸ **STALE** | pg-boss patch applied; superseded |
| #202 (Run 58) | 58 | ⏸ **STALE** | @types/node managed; superseded by 52+ runs |
| #201 (Run 57) | 57 | ⏸ **STALE** | Superseded by 53 later runs |
| #196 (Run 64) | 64 | ⏸ **STALE** | Risk notes absorbed into deferred list |
| #195 (Run 63) | 63 | ⏸ **STALE** | wouter is current; superseded |
| #194 (Run 62) | 62 | ⏸ **STALE** | Superseded by 48+ later runs |

**Owner action recommended:** Bulk-close stale audit PRs #194–#276 (34 PRs). All are documentation-only, superseded by later runs. None contain active code changes.

---

## Deferred Major Versions — Migration Notes

### `express` 4 → 5 (4.22.2 → 5.2.1)
- 20+ route handlers in `server/routers/` use callback-style `(req, res, next)` error patterns
- Express v5 auto-propagates async errors — every `async` handler needs audit
- Breaking: `router.param()` callback signature changed; `req.params` typing differs
- **Estimated effort:** 2–4 hours of audit + full regression testing
- **Action:** Create `feat/express-v5-migration` branch

### `@types/express` 4 → 5 (4.17.21 → 5.0.6)
- Blocked entirely by express v4→v5 deferral
- Upgrading types ahead of runtime package causes TS mismatches

### `@types/node` 24 → 25 (24.13.1 → 25.9.3)
- Node 25 ships APIs unavailable on Node 22 LTS (current runtime)
- Upgrading types introduces false-positive TS errors
- **Unblock when:** runtime is upgraded to Node 25 LTS

### `pnpm` 10 → 11 (10.34.1 → 11.7.0)
- v11 requires `pnpm-workspace.yaml` format change; lockfile format changes
- All CI scripts referencing lockfile format would need update
- **Action:** Dedicated lockfile migration + CI verification

### `puppeteer` 24 → 25 (24.43.1 → 25.1.0)
- v25 is ESM-only — all `require('puppeteer')` calls must become `import`
- `executablePath()` is now async — affects `server/draftPdfRoute.ts`
- **Estimated effort:** 1–2 hours including PDF worker regression testing

### `typescript` 5 → 6 (5.9.3 → 6.0.3)
- 9 documented breaking changes in TS 6 release notes
- Notable: stricter `noImplicitOverride`, changed inference in conditional types, `bundler` mode resolution changes
- Current `tsconfig.json` uses `bundler` mode — compatibility audit required
- **Estimated effort:** 1–3 hours depending on violations found

---

## Dependency Health Snapshot

```
Total packages: 777
Vulnerabilities: 0
Outdated (patch/minor): 0
Outdated (major, deferred): 6
Last code update: Run 106 (2026-06-17) — 16 packages upgraded
Last CVE fix: Run 86 / PR #244 — form-data HIGH CVE (GHSA-fjvf-q6vc-5p99)
```

**Fully current** on all patch and minor versions. The 6 deferred majors are tracked and documented; none carry exploitable CVEs at current versions.

---

## Recommendations

1. **No code action required** — 0 vulnerabilities, 0 available patch/minor updates.
2. **Bulk-close 34 stale audit PRs** (#194–#276) — all docs-only, superseded by later runs.
3. **Do not merge** any of the 6 deferred major-version updates without dedicated migration branches.
4. When ready to migrate: start with `puppeteer` v25 (smallest scope) or `pnpm` v11 (CI-only impact).

---

## Files Changed This Run

- `docs/DEPENDABOT_AUDIT_RUN_111_2026-06-17.md` — this report

## No Source Code Changes

This is a documentation-only PR. `pnpm audit` is clean and all packages are current within their pinned major versions.
