# Dependency Audit — 2026-06-19 (Run 122)

Automated dependency health check. 779 total packages audited.

---

## Vulnerability Scan

```
pnpm audit — 0 vulnerabilities across 779 packages
```

**Result: Clean.**

---

## Updates Applied — 0 new packages ✅

All patch and minor updates from Run 120 are already applied to this branch. `pnpm outdated` confirms no new patch or minor releases have landed since Run 121.

---

## Open Dependabot Audit PRs — Decision Log

| PR | Title | Decision | Reason |
|----|-------|----------|--------|
| [#290](https://github.com/moizj00/ttml-app/pull/290) | Run 120 — 16 safe updates | **Superseded** by this PR | All 16 updates are included in this branch's commit history |
| [#291](https://github.com/moizj00/ttml-app/pull/291) | Run 121 — 0 new updates | **Superseded** by this PR | Run 121 docs already committed; this PR extends that record |

This PR (`claude/intelligent-gates-z8b86m`) is 3 commits ahead of `main` and includes:
1. `c0a39ca` — SEO audit documentation (non-dep change)
2. `85f9110` — Run 120: 16 dependency updates applied
3. `e0327e2` — Run 121: steady-state audit report

Merging this PR is the cleanest path — close #290 and #291 as superseded.

---

## Deferred Updates — 6 packages ⛔ (all major, intentionally held)

| Package | Current | Latest | Reason |
|---------|---------|--------|--------|
| `express` | 4.22.2 | 5.2.1 | **Major rewrite** — async error handling, path matching, removed APIs. Needs coordinated migration of all routes and middleware in `server/`. |
| `@types/express` | 4.17.21 | 5.0.6 | Blocked on `express` v5 migration above. |
| `@types/node` | 24.13.1 | 26.0.0 | Node 26 types require Node 26 runtime — infrastructure change, not a dep bump. |
| `pnpm` | 10.34.1 | 11.8.0 | Major lockfile format changes; needs coordinated cache invalidation across CI. |
| `puppeteer` | 24.43.1 | 25.1.0 | Major version — API surface changes. Needs explicit testing of PDF generation path (`server/draftPdfRoute.ts`). |
| `typescript` | 5.9.3 | 6.0.3 | **TypeScript 6** — stricter narrowing, removed ES5/ES3 emit targets. Requires dedicated migration + full `pnpm check` pass. |

---

## Deferred Package Deep-Dive

### `express` 4 → 5 (blocked)
Express 5 is a full async-first rewrite. Breaking changes:
- `req.params` values are no longer decoded by default
- `path-to-regexp` v8 used for route matching — `*` no longer matches `/` 
- Built-in async error propagation (thrown errors reach `app.use(err, req, res, next)` automatically)
- Removed: `res.json()` stringify replacer, `req.host`, several deprecated middleware APIs

Needs a full audit of every route, middleware, and error handler in `server/`. Recommend a dedicated sprint with regression coverage.

### `typescript` 5.9 → 6.0 (blocked)
TypeScript 6 removes `ES5`/`ES3` emit targets and introduces stricter narrowing in several edge cases. The codebase passes `tsc --noEmit` cleanly on 5.9.3. Must re-run `pnpm check` after upgrade. No migration scheduled.

### `@types/node` 24 → 26 (blocked)
Node 26 introduced new globals and changed some type signatures. Upgrading `@types/node` without upgrading the runtime risks type/runtime mismatches. Infrastructure must move to Node 26 first.

### `pnpm` 10 → 11 (blocked)
pnpm 11 changes the lockfile format. Any CI/CD pipeline caching `pnpm-lock.yaml` will break on first run. Needs coordinated cache invalidation and CI update.

### `puppeteer` 24 → 25 (blocked)
Puppeteer 25 changes launch API defaults and deprecates several `Page` methods used in the PDF generation path. Requires explicit testing of the attorney-approval PDF flow before merging.

---

## Cumulative Update History (Runs 119–122)

| Run | Date | Updates Applied | Vulnerabilities |
|-----|------|-----------------|-----------------|
| 119 | 2026-06-18 | 13 packages | 0 |
| 120 | 2026-06-19 | 16 packages | 0 |
| 121 | 2026-06-19 | 0 (steady state) | 0 |
| 122 | 2026-06-19 | 0 (steady state) | 0 |

---

## Summary

| Metric | Value |
|--------|-------|
| Total packages audited | 779 |
| Vulnerabilities (CVEs) | **0** |
| New updates this run | **0** |
| Packages skipped (major) | 6 |
| Superseded audit PRs | 2 (#290, #291) |
| TypeScript check | **Clean** |
