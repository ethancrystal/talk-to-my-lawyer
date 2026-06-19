# Dependency Audit — 2026-06-19 (Run 121)

Automated dependency health check. 779 total packages audited.

---

## Vulnerability Scan

```
pnpm audit — 0 vulnerabilities across 779 packages
```

**Result: Clean.**

---

## Updates Applied — 0 new packages ✅

All patch and minor updates from Run 120 are already applied. No new updates have become available since the previous session.

---

## Deferred Updates — 6 packages ⛔ (unchanged from Run 120)

| Package | Current | Latest | Reason |
|---------|---------|--------|--------|
| `express` | 4.22.2 | 5.2.1 | **Major rewrite** — async error handling, path matching, removed APIs. Needs coordinated migration. |
| `@types/express` | 4.17.21 | 5.0.6 | Blocked on `express` v5 migration above. |
| `@types/node` | 24.13.1 | 26.0.0 | Node 26 types require Node 26 runtime — infrastructure change, not a dep bump. |
| `pnpm` | 10.34.1 | 11.8.0 | Major lockfile format changes; needs coordinated upgrade across CI. |
| `puppeteer` | 24.43.1 | 25.1.0 | Major version — API surface changes. Needs explicit PDF generation path testing. |
| `typescript` | 5.9.3 | 6.0.3 | **TypeScript 6** — stricter type-checking, removed legacy emit targets. Requires dedicated migration + full type audit. |

---

## Cumulative Update History (Runs 119–121)

| Run | Date | Updates Applied | Vulnerabilities |
|-----|------|-----------------|-----------------|
| 119 | 2026-06-18 | 13 packages | 0 |
| 120 | 2026-06-19 | 16 packages | 0 |
| 121 | 2026-06-19 | 0 (steady state) | 0 |

---

## Summary

| Metric | Value |
|--------|-------|
| Total packages audited | 779 |
| Vulnerabilities (CVEs) | **0** |
| New updates this run | **0** |
| Packages skipped (major) | 6 |
| TypeScript check | **Clean** |

---

## Deferred Package Deep-Dive

### `express` 4 → 5 (blocked)
Express 5 is a full async-first rewrite. Breaking changes include:
- `req.params` values are no longer decoded by default
- Removed `res.json()` stringify replacer argument
- Path matching uses `path-to-regexp` v8 (stricter syntax — `*` no longer matches `/`)
- Built-in async error handling (errors thrown in route handlers propagate automatically)
- Removed deprecated `req.host`, `res.redirect()` without full URL, and several other APIs

Migration requires auditing every route, middleware, and error handler in `server/`. Recommend a dedicated sprint with full regression test coverage.

### `typescript` 5.9 → 6.0 (blocked)
TypeScript 6 removes support for `ES5` / `ES3` emit targets and applies stricter narrowing in several edge cases. The codebase currently passes `tsc --noEmit` cleanly on 5.9.3, but a 6.0 migration must be verified with `pnpm check` after upgrade. No coordinated migration has been scheduled.

### `@types/node` 24 → 26 (blocked)
Node 26 introduced new globals and changed some type signatures. Upgrading `@types/node` without upgrading the runtime itself risks mismatched type expectations. Infrastructure must move to Node 26 first.

### `pnpm` 10 → 11 (blocked)
pnpm 11 changes the lockfile format. Any CI/CD pipeline that caches `pnpm-lock.yaml` will break on first run after upgrade. Needs coordinated cache invalidation and CI update.

### `puppeteer` 24 → 25 (blocked)
Puppeteer 25 changes launch API defaults and deprecates several `Page` methods used in the PDF generation path (`server/draftPdfRoute.ts`). Requires explicit testing of the attorney-approval PDF flow before merging.
