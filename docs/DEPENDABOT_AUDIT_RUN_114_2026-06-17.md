# Dependabot Audit Run 114 — 2026-06-17

Triggered by PR #280 (Run 113) open event → scheduled Claude Code routine.

---

## Summary

| Check | Result |
|-------|--------|
| `pnpm audit` | **0 vulnerabilities** ✅ |
| Dependencies scanned | **777** |
| New patch/minor updates | **0** — fully current ✅ |
| Deferred major versions | **6** — unchanged since Run 71 |
| Native Dependabot PRs | **0** — bot not configured |
| Open audit PRs assessed | **44** (snapshot at run start) |
| Merges this run | **1** — PR #280 (Run 113) merged ✅ |
| CVE overrides active | **8** — all effective |

**Clean pass with 1 merge.** No new vulnerabilities. No new package updates since Run 106.

---

## `pnpm audit` Output

```
Vulnerabilities: {'info': 0, 'low': 0, 'moderate': 0, 'high': 0, 'critical': 0}
```

All 8 CVE overrides in `pnpm.overrides` remain effective (see CVE section below).

---

## Outdated Packages

| Package | Current | Latest | Status |
|---------|---------|--------|--------|
| `@types/express` (dev) | 4.17.21 | 5.0.6 | ⏸ Deferred — blocked by express v4→v5 |
| `@types/node` (dev) | 24.13.1 | 25.9.3 | ⏸ Deferred — Node 25 types on Node 22 runtime |
| `express` | 4.22.2 | 5.2.1 | ⏸ Deferred — 20+ routes need async error-propagation audit |
| `pnpm` (dev) | 10.34.1 | 11.7.0 | ⏸ Deferred — workspace YAML + lockfile format migration |
| `puppeteer` | 24.43.1 | 25.1.0 | ⏸ Deferred — v25 ESM-only; `executablePath()` goes async |
| `typescript` (dev) | 5.9.3 | 6.0.3 | ⏸ Deferred — 9 breaking changes; `bundler` mode resolution changes |

No patch or minor updates available. All non-major dependencies are fully current.

---

## PR Decisions

| PR | Decision | Reasoning |
|----|----------|-----------|
| **#280** (Run 113) | ✅ **MERGED** | Docs-only (1 markdown, 130 lines); Vercel check neutral ✅; 0 code risk |
| #200–#276 (Runs 57–110) | ⏸ **STALE** | All docs-only, superseded by later runs. **Owner action: bulk-close ~43 PRs.** |

### Open Audit PRs (43 remaining after this run's merge)

| PR | Run | Title (summary) | Decision |
|----|-----|-----------------|----------|
| #276 | 109 | 0 new updates, 0 vulns, PR #275 safe | ⏸ STALE |
| #275 | 108 | 32 PRs assessed, 0 vulns, PR #274 safe | ⏸ STALE |
| #274 | 107 | 0 new updates, 0 vulns | ⏸ STALE |
| #273 | 106 | merged docs | ⏸ STALE |
| #265 | 102 | 0 new updates, 34 stale PRs assessed | ⏸ STALE |
| #263 | 101 | 0 new updates, 0 vulns | ⏸ STALE |
| #260 | 99 | 0 new updates, 0 vulns | ⏸ STALE |
| #258 | 98 | 2 PRs merged, 0 vulns | ⏸ STALE |
| #254 | 96 | 15 safe updates, 0 vulns | ⏸ STALE |
| #251 | 94 | 0 native PRs, 0 vulns, 7 deferred | ⏸ STALE |
| #250 | 93 | 0 native PRs, 0 vulns, 7 deferred | ⏸ STALE |
| #249 | 92 | 0 native PRs, 0 vulns, 7 deferred | ⏸ STALE |
| #248 | 91 | PR #244 MERGED (form-data CVE) | ⏸ STALE |
| #247 | 90 | 0 native PRs, 0 vulns, 7 deferred | ⏸ STALE |
| #246 | 89 | 0 native PRs, 0 vulns, 7 deferred | ⏸ STALE |
| #245 | 88 | 0 native PRs, 0 vulns, 7 deferred | ⏸ STALE |
| #243 | 86 | form-data HIGH CVE fixed, 7 pkgs updated | ⏸ STALE |
| #242 | 85 | 29 PRs assessed, 0 merged, 7 deferred | ⏸ STALE |
| #241 | 84 | 0 new upgrades, 7 deferred, 0 vulns | ⏸ STALE |
| #240 | 83 | 0 new upgrades, 7 deferred, 0 vulns | ⏸ STALE |
| #239 | 82 | 7 packages upgraded, claude-sonnet-4 EOL | ⏸ STALE |
| #238 | 81 | 7 packages + claude-sonnet-4 EOL fix | ⏸ STALE |
| #234 | 79 | 0 native PRs, 0 vulns, 7 deferred | ⏸ STALE |
| #233 | 78 | 0 native PRs, 0 vulns, 7 deferred | ⏸ STALE |
| #232 | 77 | 0 native PRs, 0 vulns, 7 deferred | ⏸ STALE |
| #231 | 76 | 0 native PRs, 0 vulns, 7 deferred | ⏸ STALE |
| #230 | 75 | 0 native PRs, 0 vulns, 7 deferred | ⏸ STALE |
| #229 | 74 | 0 native PRs, 0 vulns, 7 deferred | ⏸ STALE |
| #228 | 73 | 0 native PRs, 0 vulns, 7 deferred | ⏸ STALE |
| #226 | 71 | pg-boss 12.19.1 + 2 patches, 0 vulns | ⏸ STALE |
| #225 | 70 | 20 PRs assessed, 0 merged, security CLEAN | ⏸ STALE |
| #224 | 69 | 19 PRs assessed, 0 merged, security CLEAN | ⏸ STALE |
| #223 | 64 | esbuild 0.28.1 confirmed + B2B | ⏸ STALE |
| #222 | 63 | esbuild 0.28.1 (2 CVEs cleared) | ⏸ STALE |
| #221 | 62 | esbuild 0.28.1 (2 CVEs patched) | ⏸ STALE |
| #220 | — | esbuild 0.28.0→0.28.1 — patch 2 CVEs | ⏸ STALE |
| #218 | 71 | 0 PRs, 0 vulns, P0 outage | ⏸ STALE |
| #217 | 70 | 0 PRs, 0 vulns, P0 outage | ⏸ STALE |
| #215 | 69 | report + audit record | ⏸ STALE |
| #206 | 60 | report + audit record | ⏸ STALE |
| #202 | 58 | @types/node 24.13.2, 0 advisories | ⏸ STALE |
| #201 | 57 | comprehensive dependency health | ⏸ STALE |
| #200 | 57 | 0 packages upgraded, 0 advisories | ⏸ STALE |

All 43 remaining open PRs are docs-only audit records superseded by later runs. None contain code changes. No merges warranted.

---

## Native Dependabot PRs

**0 open.** No `.github/dependabot.yml` configured. All dependency monitoring handled by scheduled Claude Code audit sessions.

---

## Deferred Major Versions (6 — unchanged since Run 71)

### `express` 4.22.2 → 5.2.1
- **Risk:** v5 promotes async middleware error propagation; rejected errors/thrown exceptions now forward to `next(err)` automatically. All 20+ Express routes need an audit for side-effects.
- **Breaking changes:** Error-handling middleware signatures changed; `req.query` parser stricter.
- **Action:** Plan migration sprint; create dedicated branch. Not safe to auto-upgrade.

### `@types/express` 4.17.21 → 5.0.6
- **Risk:** Coupled to express v4→v5 — blocked.
- **Action:** Upgrade together with express.

### `@types/node` 24.13.1 → 25.9.3
- **Risk:** Node 25 types on a Node 22 runtime. Some type signatures may not match the runtime API.
- **Action:** Defer until Node 25 is the production runtime.

### `pnpm` 10.34.1 → 11.7.0
- **Risk:** v11 changes `pnpm-workspace.yaml` format and lockfile structure. All CI/CD pipelines using `pnpm install` must be tested against the new format.
- **Action:** Evaluate in a throwaway branch; lock to v10 until tested.

### `puppeteer` 24.43.1 → 25.1.0
- **Risk:** v25 is ESM-only. `executablePath()` becomes async. Direct `require('puppeteer')` calls break. PDF generation route (`server/draftPdfRoute.ts`) must be audited.
- **Action:** Major migration — track Puppeteer v25 release notes before upgrading.

### `typescript` 5.9.3 → 6.0.3
- **Risk:** 9 breaking changes including `bundler` module resolution changes that could affect `@shared/*` and `@/*` path aliases in `tsconfig.json`. `pnpm check` would likely fail immediately.
- **Action:** Plan TS 6 migration sprint; run `pnpm check` on a throwaway branch first.

---

## CVE Overrides (8 — all effective)

| Package | CVE | Override | Mitigation |
|---------|-----|----------|------------|
| `esbuild` | 2 CVEs | `"esbuild": "0.28.1"` | Build-time only; no runtime exposure |
| `dompurify` | 1 CVE | `"dompurify@<=3.3.3": ">=3.4.0"` | Input sanitized upstream; pinned to 3.4.11 |
| `brace-expansion` | 1 CVE | `"brace-expansion": "5.0.6"` | Indirect dep; no user-controlled input path |
| `path-to-regexp` | 1 CVE | `"path-to-regexp": "0.1.13"` | Express router patterns are static/internal |
| `form-data` | 1 CVE | `"form-data@<2.5.6": ">=2.5.6"` | Patched via override; no direct exposure |
| `postcss` | 1 CVE | `"postcss@<8.5.10": ">=8.5.10"` | Build-time only |
| `qs` | 1 CVE | `"qs": ">=6.15.2"` | Express v4 internal; no direct query string injection surface |
| `@opentelemetry/core` | 1 CVE | `"@opentelemetry/core@<2.8.0": ">=2.8.0"` | Observability-only; no auth/data path |

---

## Recommended Owner Actions

1. **Bulk-close stale audit PRs #200–#276** (~43 PRs) — all superseded, docs-only
2. **Configure `.github/dependabot.yml`** — enable native Dependabot to replace this manual routine
3. **Plan express v5 migration** — EOL risk; 20+ routes need async error handling audit
4. **Plan TypeScript 6 migration** — 9 breaking changes including `bundler` resolution changes
5. **Evaluate pnpm v11** — workspace YAML + lockfile format migration required

---

## Run History (recent)

| Run | Date | Merges | Vulns | New Updates |
|-----|------|--------|-------|-------------|
| 114 (this) | 2026-06-17 | 1 (PR #280) | 0 | 0 |
| 113 | 2026-06-17 | 1 (PR #279) | 0 | 0 |
| 112 | 2026-06-17 | 1 (PR #278) | 0 | 0 |
| 111 | 2026-06-17 | 1 (PR #277) | 0 | 0 |
| 110 | 2026-06-17 | 0 | 0 | 0 |
| 109 | 2026-06-17 | 0 | 0 | 0 |
| 108 | 2026-06-17 | 0 | 0 | 0 |
| 107 | 2026-06-17 | 0 | 0 | 0 |
| 106 | 2026-06-17 | — | 0 | **16 packages upgraded** |

---

_Generated by [Claude Code](https://claude.ai/code/session_01Eb6ebQgTafsJta1QbqtDXt) on 2026-06-17_
