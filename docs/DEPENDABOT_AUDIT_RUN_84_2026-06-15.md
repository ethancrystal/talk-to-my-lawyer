# Dependabot Audit — Run 84 (2026-06-15)

Scheduled dependency audit. Investigated all open Dependabot PRs, reviewed release notes, advisories, and breaking changes for each package.

---

## Native Dependabot PRs

**0 open.** `dependabot[bot]` is not enabled on this repository. All dependency management runs via scheduled Claude Code audit sessions.

---

## Stale Audit-Report PRs (open, docs-only — no action taken)

There are **69 open** prior audit-report PRs on this repo (#110–#240). All are docs-only records of previous runs. They are **not merged** because:
- They duplicate information already committed to `main` via their respective runs
- Merging them would only bring in stale documentation on top of already-current code

**Decision: Leave all 69 stale audit PRs unmerged.** They are historical records, not pending changes.

---

## Packages Upgraded (0)

No new packages available for safe upgrade. All previously identified safe upgrades were applied in Run 81 (PR #238 / PR #239) and remain at latest via pnpm lockfile resolution:

| Package | package.json specifies | Lockfile (current) | Status |
|---------|----------------------|--------------------|--------|
| `@anthropic-ai/sdk` | `^0.104.1` | `0.104.2` | ✅ On latest |
| `@supabase/supabase-js` | `^2.108.1` | `2.108.2` | ✅ On latest |
| `@sentry/node` | `^10.57.0` | `10.58.0` | ✅ On latest |
| `@sentry/react` | `^10.57.0` | `10.58.0` | ✅ On latest |
| `@playwright/test` | `^1.60.0` | `1.61.0` | ✅ On latest |
| `vitest` | `^4.1.8` | `4.1.9` | ✅ On latest |
| `@vitest/coverage-v8` | `4.1.8` | `4.1.9` | ✅ On latest |

---

## Packages Deferred (7 — stable policy since Run 71) ⚠️

| Package | Current | Latest | Decision | Reasoning |
|---------|---------|--------|----------|-----------|
| `wouter` | 3.7.1 | 3.10.0 | ⏸️ DEFERRED | `pnpm.patchedDependencies` patch targets `wouter@3.7.1` exactly; upgrading breaks the patch |
| `@types/express` | 4.17.21 | 5.0.6 | ⏸️ DEFERRED | v5 types assume Express 5 runtime; false type errors against Express 4 |
| `@types/node` | 24.13.1 | 25.9.3 | ⏸️ DEFERRED | Node 25 types on Node 22 runtime = false positives; pinned `^24.x` intentionally |
| `express` | 4.22.2 | 5.2.1 | ⏸️ DEFERRED | 20+ REST routes need auditing for async error-propagation changes |
| `pnpm` | 10.34.1 | 11.7.0 | ⏸️ DEFERRED | v11 requires `pnpm-workspace.yaml`; breaks lockfile format |
| `puppeteer` | 24.43.1 | 25.1.0 | ⏸️ DEFERRED | v25 is ESM-only; `executablePath()` becomes async |
| `typescript` | 5.9.3 | 6.0.3 | ⏸️ DEFERRED | 9 documented behaviour changes; needs dedicated migration branch |

### Deferral Reasoning Detail

**`wouter` 3.7.1 → 3.10.0**: The project applies a pnpm patch via `pnpm.patchedDependencies` that pins to exactly `wouter@3.7.1`. Upgrading would invalidate the patch and cause install failure. Requires patching the new version or evaluating if the upstream fix has landed before bumping.

**`@types/express` 4.17.21 → 5.0.6**: Express v5 types (`@types/express@5.x`) require the Express 5 runtime API. The project is on Express 4 (`^4.22.2`). Installing v5 types against Express 4 generates false type errors on `req`, `res`, `next` signatures. Must upgrade `express` first.

**`@types/node` 24.13.1 → 25.9.3**: Node.js 25 is not in LTS. The project's `engines` and CI target Node 22 LTS. Node 25 types introduce type stubs for APIs that do not exist in the runtime, causing false positives in `pnpm check` / `tsc`.

**`express` 4.22.2 → 5.2.1**: Express 5 requires async error handling — route handlers that throw synchronously are no longer caught by the default error handler without explicit `next(err)` or returning the rejected promise. The project has 20+ REST route registrars (`server/supabaseAuth/routes/`, `server/n8nCallback.ts`, etc.). Each needs auditing. Blocked pending a dedicated migration spike.

**`pnpm` 10.34.1 → 11.7.0**: pnpm 11 changes the workspace protocol handling and lockfile v9 format. The project uses `pnpm.patchedDependencies` and `pnpm-lock.yaml` is committed. An in-place upgrade without migration risks breaking the lockfile in CI.

**`puppeteer` 24.43.1 → 25.1.0**: Puppeteer v25 drops CommonJS support and is ESM-only. The project's `tsconfig.json` targets CommonJS via `esbuild` for the server bundle. `executablePath()` also becomes async in v25, requiring callers to be updated. Requires a bundle/build strategy review first.

**`typescript` 5.9.3 → 6.0.3**: TypeScript 6 ships 9 breaking behaviour changes including: stricter `exactOptionalPropertyTypes` defaults, changed resolution for `allowImportingTsExtensions`, and removed support for pre-ES2015 emit targets. Requires a dedicated branch to surface and resolve all type errors introduced.

---

## Security Status

```
pnpm audit → 0 vulnerabilities (775 dependencies scanned)
```

No advisories. Clean.

---

## Validation

- `pnpm check` — ✅ passes (tsc --noEmit, 0 errors)
- `pnpm audit` — ✅ 0 vulnerabilities (775 dependencies)
- `pnpm outdated` — 7 packages remain, all appropriately deferred; 7 previously upgraded packages confirmed on latest via lockfile

---

## Summary

| Metric | Value |
|--------|-------|
| Native Dependabot PRs | 0 (not enabled) |
| Stale audit PRs | 69 open (historical, unmerged intentionally) |
| New upgrades applied | 0 |
| Upgrades confirmed on latest | 7 (via lockfile) |
| Packages deferred | 7 (unchanged since Run 71) |
| Vulnerabilities | 0 |
| Dependencies scanned | 775 |

---

## Files Changed

| File | Change |
|------|--------|
| `docs/DEPENDABOT_AUDIT_RUN_84_2026-06-15.md` | Audit notes for Run 84 |
