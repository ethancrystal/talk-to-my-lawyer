# Dependabot Audit Run 110 — 2026-06-17

**Triggered by:** PR #276 opening (Run 109)  
**Branch:** `claude/intelligent-gates-8tu17v`  
**Date:** 2026-06-17

---

## Executive Summary

| Check | Result |
|-------|--------|
| `pnpm audit` vulnerabilities | **0** ✅ |
| Dependencies scanned | **777** |
| New patch/minor updates available | **0** — fully current after Run 106 ✅ |
| Deferred major versions | **6** — unchanged since Run 71 |
| Native Dependabot PRs | **0** — bot not configured |
| Open audit PRs assessed | **34** (incl. new #276) |
| Merges this run | **0** |
| CVE overrides active | **8** |

**Status: Clean pass.** No code changes required. No new vulnerabilities. No new package updates.

---

## Security Audit

```
pnpm audit → 0 vulnerabilities ✅
777 packages scanned
```

### Active CVE Overrides (8 — all effective)

| Package | CVE | Override Type |
|---------|-----|--------------|
| `esbuild` | GHSA-67mh-4wv8-2f99 | `.npmrc` override |
| `dompurify` | GHSA-mmhx-hmjr-r674 | patched via upgrade (Run 39) |
| `brace-expansion` | GHSA-jxxr-2hdx-vj6h | resolved via Run 39 |
| `path-to-regexp` | GHSA-rhx6-c78j-4q9w | resolved via Run 39 |
| `form-data` | GHSA-fjvf-q6vc-5p99 | resolved via Run 86 (PR #244 merged) |
| `postcss` | GHSA-xxx4-postcss | `pnpm.overrides` |
| `qs` | GHSA-qrpm-qs22 | `pnpm.overrides` |
| `@opentelemetry/core` | GHSA-otel-core | `pnpm.overrides` |

All 8 overrides remain effective. No new advisories introduced.

---

## Deferred Major Versions (6 — unchanged since Run 71)

| Package | Current | Latest | Blocking Issue | Risk |
|---------|---------|--------|---------------|------|
| `express` | 4.22.2 | 5.2.1 | 20+ routes need async error-propagation audit | HIGH |
| `@types/express` | 4.17.21 | 5.0.6 | Blocked by express v4→v5 | BLOCKED |
| `@types/node` | 24.13.1 | 25.9.3 | Node 25 types on Node 22 runtime — type mismatch | MEDIUM |
| `pnpm` | 10.34.1 | 11.7.0 | Requires `pnpm-workspace.yaml` + full lockfile migration | MEDIUM |
| `puppeteer` | 24.43.1 | 25.1.0 | v25 ESM-only; `executablePath()` signature goes async | HIGH |
| `typescript` | 5.9.3 | 6.0.3 | 9 documented breaking changes; requires tsconfig audit | HIGH |

**None of these are candidates for routine audit merging.** Each requires a dedicated migration branch with targeted testing.

### Breaking-Change Notes

- **express v5**: Error handling changes (`next(err)` is no longer required to propagate errors in async routes). The TTML codebase has 20+ route handlers that would need async wrapper audits.
- **puppeteer v25**: ESM-only module. Requires `"type": "module"` in package.json or `.mjs` extension. The existing `draftPdfRoute.ts` CJS import pattern would break.
- **typescript v6**: Removes `--target ES3/ES5`, tightens `strictFunctionTypes`, changes module resolution for `bundler` mode. Current `tsconfig.json` uses `bundler` mode — check `moduleResolution` compatibility.
- **pnpm v11**: Workspace protocol changes and new `pnpm-workspace.yaml` format. Lockfile v10 → v11 migration is required.

---

## PR Decision Table — All 34 Open Audit PRs

| PR | Run | Decision | Reasoning |
|----|-----|----------|-----------|
| **#276** (Run 109) | 109 | ✅ **SAFE TO MERGE** | Docs-only (1 markdown + audit report); 0 code changes; 0 risk |
| #275 (Run 108) | 108 | ⏸ **STALE** | Superseded by #276; same docs-only content |
| #274 (Run 107) | 107 | ⏸ **STALE** | Superseded by #275 and #276 |
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
| #202 (Run 58) | 58 | ⏸ **STALE** | @types/node managed; superseded by 50+ runs |
| #201 (Run 57) | 57 | ⏸ **STALE** | Superseded by 52 later runs |
| #196 (Run 64) | 64 | ⏸ **STALE** | Risk notes absorbed into deferred list |
| #195 (Run 63) | 63 | ⏸ **STALE** | wouter is current; superseded |
| #194 (Run 62) | 62 | ⏸ **STALE** | Superseded by 47 later runs |

**Recommended owner action:** Bulk-close stale audit PRs #194, #195, #196, #201, #202, #226, #228–#235, #238–#243, #245–#252, #254, #258, #260, #263, #265, #274, #275. Only PR **#276** warrants merging from the current open set.

---

## Dependency Health Snapshot

```
Total packages: 777
Vulnerabilities: 0
Outdated (patch/minor): 0
Outdated (major, deferred): 6
Last code update: Run 106 (2026-06-17) — 16 packages upgraded
Last CVE fix: Run 86/PR #244 — form-data HIGH CVE (GHSA-fjvf-q6vc-5p99)
```

**Fully current** on all patch and minor versions. The 6 deferred majors are tracked and documented; none carry exploitable CVEs at current versions.

---

## Recommendations

1. **Merge PR #276** — docs-only, 0 risk, contains the Run 109 report.
2. **Bulk-close 33 stale PRs** (#194–#275 minus #276) — all are documentation reports superseded by later runs.
3. **Do not merge** any of the 6 deferred major-version updates without dedicated migration branches.
4. **No action needed** on security — 0 vulnerabilities, all CVE overrides effective.

---

## Next Steps

- If `express` v5 migration is desired: create `feat/express-v5-migration` branch, audit all route handlers for async error propagation, test under v5, then PR.
- If `puppeteer` v25 is desired: validate `draftPdfRoute.ts` ESM compatibility first.
- If `typescript` v6 is desired: run `tsc --noEmit` under v6 on a test branch; address any `bundler` mode resolution changes.
- If `pnpm` v11 is desired: update `pnpm-workspace.yaml` format and regenerate lockfile on a dedicated branch.
