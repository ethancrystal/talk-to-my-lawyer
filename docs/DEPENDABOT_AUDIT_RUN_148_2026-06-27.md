# Dependency Audit Run #148 — 2026-06-27

Scheduled Claude Code dependency audit routine.

---

## Summary

| Metric | Result |
|--------|--------|
| Native Dependabot PRs | **0** |
| CVEs (`pnpm audit`) | **0** |
| Updates applied | **0** (nothing new; `@types/node` 26 applied in run #147) |
| Active `pnpm.overrides` CVE pins | **19** |
| Deferred major-version upgrades | **8** (unchanged from run #147) |
| Open audit-report PRs (stale) | **47** (#389–#496, all this routine's reports) |
| Total dependencies scanned | **787** |

---

## Native Dependabot PR Audit

Scanned all open PRs via GitHub API (full list of 100+ PRs traversed).

**Result: 0 native Dependabot PRs.**

- `dependabot[bot]` has never authored a PR on this repository.
- `.github/dependabot.yml` is not configured — Dependabot is not enabled.
- All 47 open "Dependabot" PRs are prior audit-run report PRs authored by `moizj00` (this same routine, runs #70–#147). They are stale duplicates; the canonical latest is PR #496 (run #147).

**Decision: N/A — no native Dependabot PRs to merge, close, or act on.**

---

## CVE Audit

`pnpm audit` returned **0 vulnerabilities** across 787 total dependencies.

All 19 `pnpm.overrides` CVE pins confirmed active (unchanged from run #147):

| Override | Pinned to | Vulnerability Class |
|----------|-----------|---------------------|
| `tailwindcss>nanoid` | `3.3.7` | CVE sub-dep pin |
| `fast-xml-parser` | `5.7.2` | XML injection |
| `esbuild` | `0.28.1` | Build tool pin |
| `path-to-regexp` | `0.1.13` | ReDoS |
| `picomatch` | `4.0.4` | Glob ReDoS |
| `brace-expansion` | `5.0.6` | ReDoS |
| `langsmith` | `>=0.6.0` | Security patch floor |
| `fast-xml-builder` | `>=1.1.7` | XML injection |
| `qs` | `>=6.15.2` | Prototype pollution |
| `@tootallnate/once` | `3.0.1` | Version pin |
| `basic-ftp@<=5.2.1` | `>=5.2.2` | FTP security patch |
| `basic-ftp@=5.2.0` | `>=5.2.1` | FTP security patch |
| `dompurify@<=3.3.3` | `>=3.4.0` | XSS bypass |
| `dompurify@<=3.4.10` | `>=3.4.11` | XSS bypass |
| `@xmldom/xmldom` | `0.9.10` | XML security |
| `uuid` | `14.0.0` | UUID version pin |
| `postcss@<8.5.10` | `>=8.5.10` | CSS injection |
| `form-data@<2.5.6` | `>=2.5.6` | Security patch |
| `@opentelemetry/core@<2.8.0` | `>=2.8.0` | Security patch |

> ⚠️ **Critical reminder:** Do NOT upgrade `pnpm` to v11 before migrating all 19 overrides from `package.json` → `pnpm-workspace.yaml`. pnpm v11 silently discards `pnpm.overrides` in `package.json`, re-exposing all patched vulnerabilities.

---

## Updates Applied This Run

**None.** Run #147 (PR #496) already applied the only available safe update (`@types/node` 24.13.1 → 26.0.1). Confirmed current versions from `package.json`:

| Package | Current version in package.json |
|---------|----------------------------------|
| `@types/node` | `^26.0.1` ✅ |
| `typescript` | `5.9.3` (deferred) |
| `ai` | `^6.0.208` (deferred) |
| `@ai-sdk/anthropic` | `^3.0.85` (deferred) |
| `@ai-sdk/openai` | `^3.0.74` (deferred) |
| `express` | `^4.22.2` (deferred) |
| `@types/express` | `4.17.21` (deferred) |
| `pnpm` | `^10.34.4` (deferred) |
| `puppeteer` | `^24.43.1` (deferred) |

---

## Deferred Major-Version Upgrades (8 packages — unchanged)

| Package | Current | Latest Stable | Risk | Decision | Reason |
|---------|---------|--------------|------|----------|--------|
| `typescript` | 5.9.3 | 6.0.3 | 🔴 HIGH | ❌ DEFER | `types:[]` default silently removes Node globals; needs dedicated migration |
| `ai` | ^6.0.208 | 7.0.3 | 🔴 HIGH | ❌ DEFER | ESM-only; CJS server is hard blocker; atomic group with ai-sdk peers |
| `@ai-sdk/anthropic` | ^3.0.85 | 3.0.86 stable (v4 = canary only) | 🔴 HIGH | ❌ DEFER | v4.x exists only as canary/beta; blocked on `ai@7` |
| `@ai-sdk/openai` | ^3.0.74 | 3.0.67 stable (v4 = canary only) | 🔴 HIGH | ❌ DEFER | v4.x canary/beta only; blocked on `ai@7` |
| `express` | ^4.22.2 | 5.2.1 | 🟡 MED | ❌ DEFER | Query parser default change may break tRPC batching; needs integration validation |
| `@types/express` | 4.17.21 | 5.0.6 | 🟡 MED | ❌ DEFER | Gated on `express@5` migration |
| `pnpm` | ^10.34.4 | 11.9.0 | 🟡 MED | ❌ DEFER | Must migrate 19 overrides to `pnpm-workspace.yaml` first |
| `puppeteer` | ^24.43.1 | 25.2.1 | 🟡 MED | ❌ DEFER | ESM-only; bundle with `ai@7` ESM migration sprint |

---

## Observations This Run

### 1. Audit-report PR accumulation (47 open PRs)

This routine has created 47 open report-only PRs (#389–#496) on the repository. These are stale duplicates — none contain actionable code changes beyond the `@types/node` update in run #147. The PR list is becoming noise. **Recommendation:** merge or close the prior audit report PRs; keep only the most recent (#496) open.

### 2. No new dependency updates available

The stable ecosystem has been static since run #147. The `@ai-sdk/*` v4 canary has not graduated to a stable release. `typescript@6`, `express@5`, and the ESM-gated packages remain blocked by the same prerequisites documented in runs #143–#147.

### 3. Dependency posture: healthy

0 CVEs, 0 native Dependabot PRs, 19 CVE overrides active, 8 deferred majors with clear unblocking paths. No action required this cycle.

---

## Recommended Next Steps (priority order, unchanged from run #147)

1. **Merge/close stale audit report PRs** (#389–#494) — reduce repository noise
2. **Migrate 19 `pnpm.overrides` → `pnpm-workspace.yaml`** — unblocks `pnpm@11`
3. **Plan ESM migration sprint** — co-upgrade `ai@7` + `@ai-sdk/*@4` + `puppeteer@25`
4. **Plan Express 5 migration** — use official codemod; validate tRPC + webhook surface
5. **Plan TypeScript 6 migration** — add `"types": ["node"]` to tsconfig first
6. **Monitor `@ai-sdk/*` v4 stable release** — check npm weekly until canary graduates

---

## Delta from Run #147

| Change | Detail |
|--------|--------|
| Updates applied | None (no new stable updates available) |
| Deferred count | 8 (unchanged) |
| CVEs | 0 (unchanged) |
| New findings | 47 stale audit-report PRs identified; ESM/pnpm/TS6 blockers unchanged |
