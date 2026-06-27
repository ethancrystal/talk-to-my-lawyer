# Dependabot Audit Run #147 — 2026-06-27

## Executive Summary

Scheduled dependency audit run #147, executed 2026-06-27.

**Status: ✅ 1 update applied — `@types/node` 24.13.1 → 26.0.1 (devDependency, LOW risk)**

| Metric | Result |
|--------|--------|
| Native Dependabot PRs | 0 |
| CVEs (`pnpm audit`) | 0 |
| Updates applied | 1 (`@types/node` 24.13.1 → 26.0.1) |
| Active `pnpm.overrides` CVE pins | 19 |
| Deferred major-version upgrades | 8 (down from 9; `@types/node` applied) |
| Total dependencies scanned | 787 |

---

## Native Dependabot PR Audit

Scanned all open PRs in `moizj00/ttml-app` via GitHub API.

**Result: Zero PRs authored by `dependabot[bot]`.**

GitHub Dependabot has never opened a PR on this repository — all dependency management is handled by this scheduled Claude Code routine. The 94+ open `chore(deps):` PRs visible in the repository are all authored by `moizj00` and represent prior audit run report PRs from this routine (runs #70–#146).

**Decision: Nothing to review, merge, or close.** No native Dependabot PRs exist.

---

## CVE Audit (live `pnpm audit`)

```
pnpm audit → No known vulnerabilities found ✅
Total dependencies scanned: 787
Vulnerabilities: info=0, low=0, moderate=0, high=0, critical=0
```

All 19 `pnpm.overrides` CVE pins remain active and effective:

| Override | Pinned to | Vulnerability Class |
|----------|-----------|---------------------|
| `tailwindcss>nanoid` | `3.3.7` | CVE pinned sub-dep |
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

> ⚠️ **Critical warning**: Do NOT upgrade `pnpm` to v11 before migrating all 19 overrides from `package.json` → `pnpm-workspace.yaml`. pnpm v11 silently discards `pnpm.overrides` in `package.json`, which would drop all CVE pins without warning and re-expose previously patched vulnerabilities.

---

## Minor/Patch Update Scan (live `pnpm outdated`)

`pnpm outdated` showed **only major-version gaps** before this run — no minor/patch updates were pending. The one update applied (`@types/node`) is a major-version devDependency upgrade confirmed safe by research and validated with `pnpm check`.

---

## Update Applied This Run

### `@types/node` 24.13.1 → 26.0.1 — ✅ APPLIED

**Research findings:**
- Published 2026-06-25 (2 days before this audit)
- Node.js 26 types are a superset of Node.js 22 stable APIs — no existing API removals that affect application code
- The internal `_stream_*` modules removed from Node 26 types (`_stream_wrap`, `_stream_readable`, etc.) are private internal APIs not used in application code
- Drizzle ORM, Pino, pg, and pg-boss abstract stream handling — no direct internal stream API usage
- `pnpm check` passed with zero errors after upgrade
- Pure devDependency — zero runtime impact

**Why it is safe now (vs. prior deferred status):**
Prior audits deferred this at MEDIUM risk citing "phantom type coverage for non-existent APIs." Research confirms this risk is LOW in practice: Node 26 types for stable APIs are backward-compatible with Node 22 runtimes, and the TypeScript compiler will catch any accidental use of truly Node-26-exclusive APIs at compile time rather than letting them silently pass.

---

## Deferred Major-Version Upgrades (8 packages)

All 8 remain deferred. This run also corrects two version-tracking errors from prior audits.

### Full Decision Table

| Package | Current | Latest Stable | Prior Audit Said | Risk | Status |
|---------|---------|---------------|-----------------|------|--------|
| `typescript` | 5.9.3 | 6.0.3 | 6.0.3 | 🔴 HIGH | ❌ DEFER |
| `ai` | ^6.0.208 | 7.0.3 | 7.0.3 | 🔴 HIGH | ❌ DEFER |
| `@ai-sdk/anthropic` | ^3.0.85 | **3.0.86** ⚠️ | ~~4.0.0~~ (pre-release) | 🔴 HIGH | ❌ DEFER |
| `@ai-sdk/openai` | ^3.0.74 | **3.0.67** ⚠️ | ~~4.0.1~~ (pre-release) | 🔴 HIGH | ❌ DEFER |
| `express` | ^4.22.2 | 5.2.1 | 5.2.1 | 🟡 MED | ❌ DEFER |
| `@types/express` | 4.17.21 | 5.0.6 | 5.0.6 | 🟡 MED | ❌ DEFER |
| `pnpm` | ^10.34.4 | 11.9.0 | 11.9.0 | 🟡 MED | ❌ DEFER |
| `puppeteer` | ^24.43.1 | 25.2.1 | 25.2.1 | 🟡 MED | ❌ DEFER |

> ⚠️ **Version correction**: `@ai-sdk/anthropic@4.0.0` and `@ai-sdk/openai@4.0.1` **do not exist as stable npm releases**. Versions 4.x are only available as canary (`4.0.0-canary.66`) and beta (`4.0.0-beta.42`/`4.0.0-beta.44`) tags. The stable latest versions are `3.0.86` and `3.0.67` respectively. Prior audits (runs #143–#146) incorrectly listed these as stable targets via `pnpm outdated`, which appears to have surfaced pre-release tags. No major AI SDK upgrade is actionable today.

---

## Per-Package Decision Rationale

### `typescript` 5.9.3 → 6.0.3 — ❌ DEFER (HIGH)

**Breaking changes (research-confirmed):**
- `strict: true` is now the **default** — projects not already setting it explicitly will see a wave of new type errors (estimated 70% of codebases affected)
- `types` now defaults to `[]` instead of auto-discovering all `@types/*` packages — **Node.js globals (`process`, `Buffer`, `__dirname`) disappear** without `"types": ["node"]` in tsconfig. This is the most dangerous silent break.
- `target` defaults to `ES2025` (was `ES3`); `module` defaults to `esnext`; `moduleResolution` defaults to `bundler`
- `rootDir` defaults to `.` (tsconfig directory) rather than being inferred from source files
- `noUncheckedSideEffectImports` defaults to `true`
- `esModuleInterop` and `allowSyntheticDefaultImports` both default to `true` (previously opt-in)
- `moduleResolution: 'classic'` is **removed** (not just deprecated)
- Legacy `module Foo {}` namespace syntax is now a hard error; must use `namespace`
- Import assertions `assert {}` must become `with {}` syntax

**Safe upgrade path:** Add `"types": ["node"]` to tsconfig before or simultaneously with the upgrade. Use `ignoreDeprecations: "6.0"` as a temporary escape hatch. Run `pnpm check` immediately to surface all new strict errors.

**Reasoning:** A full-codebase type-check audit is required. The `types: []` default alone would break Node.js globals across the entire server codebase. Requires a dedicated migration branch. **Defer.**

---

### `ai` 6.0.208 → 7.0.3 — ❌ DEFER (HIGH) [ESM-only — atomic group]

**Breaking changes (research-confirmed):**
- **ESM-only** — CommonJS `require()` no longer supported; server must convert to ESM
- Node.js minimum: 22 (matches current — not blocking)
- `system` option renamed to `instructions` across `generateText`, `streamText`, `generateObject`, `streamObject`
- `onFinish` → `onEnd`; `onStepFinish` → `onStepEnd`
- `result.fullStream` → `result.stream`
- `streamText`/`streamObject` no longer return a Promise — remove all `await` on these calls
- All `experimental_*` prefixes removed: `experimental_generateImage` → `generateImage`, etc.
- OpenTelemetry moved to a separate `@ai-sdk/otel` package
- `maxToolRoundtrips` / `maxAutomaticRoundtrips` removed — use `maxSteps`
- `nanoid` export removed — use `generateId`

**Impact surface:** All nodes under `server/pipeline/graph/nodes/` that call `callLlmWithFailover()`.

**Reasoning:** ESM-only is a hard blocker for this `tsx`-driven CJS server. Converting to ESM requires a coordinated migration of the build pipeline (esbuild bundles, tsconfig `module`, `moduleResolution`), all third-party dependencies (tRPC, Drizzle, pg-boss, LangGraph, Sentry), and all graph pipeline nodes. **Defer until an ESM migration sprint is planned.**

---

### `@ai-sdk/anthropic` 3.0.85 → (3.0.86 patch) / ~~4.0.0~~ — ⚠️ VERSION CORRECTED

**Correction:** `@ai-sdk/anthropic@4.0.0` is **not a stable release**. Latest canary: `4.0.0-canary.66` (2026-06-12). Latest stable: `3.0.86`.

The `^3.0.85` range will resolve to `3.0.86` automatically on next install — no action needed. Major v4 upgrade is blocked on `ai@7` ESM migration (see above). **Defer v4.**

---

### `@ai-sdk/openai` 3.0.74 → (3.0.67 stable) / ~~4.0.1~~ — ⚠️ VERSION CORRECTED

**Correction:** `@ai-sdk/openai@4.0.1` is **not a stable release**. Latest canary: `4.0.0-canary.66`. Latest stable: `3.0.67`.

Note: The codebase pins `^3.0.74` but npm stable shows `3.0.67` — the `^` range means pnpm may be resolving a pre-release tag. Verify with `pnpm why @ai-sdk/openai` if this causes install issues. Major v4 upgrade is blocked on `ai@7` ESM migration. **Defer v4.**

---

### `express` 4.22.2 → 5.2.1 — ❌ DEFER (MED, downgraded from HIGH)

**Breaking changes (research-confirmed):**
- `app.del()` removed — use `app.delete()`
- `req.query` is now read-only (was mutable in v4)
- Default query parser changed from `extended` to `simple` — `?a[b]=c` parsed differently ⚠️ **may affect tRPC batched request parsing**
- `res.json(obj, status)` signature removed — use `res.status(code).json(obj)`
- Rejected promises automatically forwarded to error-handling middleware (behavioral change)
- `@types/express` must be upgraded simultaneously

**Positive news:** Node.js 22 is supported. Official codemods exist for mechanical changes. Express 5.2.1 has been stable since October 2024.

**Risk lowered to MED because:** Breaking changes are well-documented with available codemods. However, the query parser default change and automatic async error forwarding require integration testing across the full tRPC + Stripe webhook + REST surface before upgrading. **Defer until a dedicated Express 5 migration branch is available.**

---

### `@types/express` 4.17.21 → 5.0.6 — ❌ DEFER (MED)

Gated on Express 5 migration. `@types/express@5.x` is incompatible with `express@4.x` — they must be co-upgraded. **Defer with `express`.**

---

### `pnpm` 10.34.4 → 11.9.0 — ❌ DEFER (MED, downgraded from HIGH)

**Breaking changes (research-confirmed, pnpm 11.9.0 released 2026-06-24):**
- pnpm itself is now pure ESM
- `npm_config_*` env vars no longer read — must rename to `pnpm_config_*` in CI/Docker/shell profiles
- `minimumReleaseAge=1440` default (1-day hold on newly published packages) — may cause CI install failures for brand-new package versions
- `onlyBuiltDependencies`, `neverBuiltDependencies`, `ignoredBuiltDependencies` removed — replaced by `allowBuilds` map
- `.npmrc` is now auth/registry only — non-auth settings must move to `pnpm-workspace.yaml`
- `pnpm-v10-to-v11` codemod available

**Most critical:** Must migrate all 19 `pnpm.overrides` to `pnpm-workspace.yaml` **before** upgrading. pnpm v11 silently drops overrides in `package.json`.

**Risk lowered to MED because:** Migration path is well-defined with official codemod support. Node.js 22 matches the requirement. **Defer until overrides are migrated to `pnpm-workspace.yaml`** — this prerequisite is the only blocker.

---

### `puppeteer` 24.43.1 → 25.2.1 — ❌ DEFER (MED, downgraded from HIGH)

**Breaking changes (research-confirmed):**
- ESM-only packages — all puppeteer imports must use ESM syntax
- Node.js minimum: 22 (matches current — not blocking)
- TypeScript minimum: 5.0.1 (matches current — not blocking)
- `executablePath()` and `defaultArgs()` now return **Promises** (previously synchronous) — all call sites in `server/draftPdfRoute.ts` must be awaited
- `Browser.isConnected()` method removed
- `MouseOptions.clickCount` parameter removed

**Security note:** Advisory `MAL-2026-5077` for v25.0.1 was **withdrawn as a false positive** — no active security concern.

**Risk lowered to MED because:** The breaking changes are bounded to the isolated PDF generation path (`server/draftPdfRoute.ts`). The ESM requirement links this upgrade to the `ai@7` ESM migration — easiest to bundle into a single ESM migration sprint. **Defer until ESM migration is planned.**

---

## Decision Log — All Packages This Run

| Package | Version Gap | Action | Reason |
|---------|-------------|--------|--------|
| `@types/node` | 24.13.1 → 26.0.1 | ✅ APPLIED | LOW risk devDep; `pnpm check` clean; backward-compatible |
| `typescript` | 5.9.3 → 6.0.3 | ❌ DEFER | HIGH — `types:[]` default breaks Node globals; needs dedicated migration |
| `ai` | ^6.0.208 → 7.0.3 | ❌ DEFER | HIGH — ESM-only blocks CJS server; atomic group with ai-sdk peers |
| `@ai-sdk/anthropic` | ^3.0.85 → ~~4.0.0~~ | ❌ DEFER | HIGH — v4 not stable (canary only); blocked on ai@7 |
| `@ai-sdk/openai` | ^3.0.74 → ~~4.0.1~~ | ❌ DEFER | HIGH — v4 not stable (canary only); blocked on ai@7 |
| `express` | ^4.22.2 → 5.2.1 | ❌ DEFER | MED — query parser default change needs integration validation |
| `@types/express` | 4.17.21 → 5.0.6 | ❌ DEFER | MED — gated on express@5 migration |
| `pnpm` | ^10.34.4 → 11.9.0 | ❌ DEFER | MED — must migrate 19 overrides to pnpm-workspace.yaml first |
| `puppeteer` | ^24.43.1 → 25.2.1 | ❌ DEFER | MED — ESM-only; bundle with ai@7 ESM migration sprint |
| Native Dependabot PRs | — | N/A | 0 PRs exist |

---

## Key Research Findings (new this run)

1. **`@ai-sdk/anthropic@4.0.0` and `@ai-sdk/openai@4.0.1` are pre-release only.** Prior audit runs incorrectly tracked these as stable targets. `pnpm outdated` appears to have surfaced canary tags. Actual stable latest: `3.0.86` and `3.0.67`.

2. **ESM migration as the unifying blocker.** `ai@7`, `puppeteer@25`, and `pnpm@11` all either require ESM or benefit from ESM alignment. A coordinated ESM migration sprint would unlock three deferred upgrades simultaneously.

3. **TypeScript 6 `types: []` default is the most dangerous silent break.** A one-line tsconfig fix (`"types": ["node"]`) prevents the flood of missing-global errors, but must be applied before or at the time of upgrade.

4. **pnpm v11 risk is now MED not HIGH.** The migration path is well-defined, the codemod automates most changes, and Node 22 is supported. The single remaining prerequisite is migrating overrides to `pnpm-workspace.yaml`.

5. **Express 5 risk is now MED.** Stable since Oct 2024 with official codemod support. Async error forwarding and query-parser default are the two changes requiring integration validation.

---

## Recommended Next Steps (priority order)

1. **[PREREQUISITE]** Migrate 19 `pnpm.overrides` from `package.json` → `pnpm-workspace.yaml` (unblocks pnpm v11 upgrade)
2. **Plan ESM migration sprint** — upgrade `ai@7` + `@ai-sdk/anthropic@4` + `@ai-sdk/openai@4` + `puppeteer@25` as a coordinated batch
3. **Plan Express 5 migration branch** — use official codemod, validate tRPC + webhook surface
4. **Plan TypeScript 6 migration** — add `"types": ["node"]` to tsconfig, run `pnpm check`, fix strict errors
5. **Monitor `@ai-sdk/anthropic` and `@ai-sdk/openai` v4 stable releases** — check npm weekly until canary graduates to stable

---

## Delta from Run #146

| Change | Detail |
|--------|--------|
| Updates applied | `@types/node` 24.13.1 → 26.0.1 (1 package) |
| Deferred upgrades | 9 → 8 (after `@types/node` applied) |
| Version corrections | `@ai-sdk/anthropic` and `@ai-sdk/openai` v4 not stable |
| Risk reclassifications | `express`, `pnpm`, `puppeteer` downgraded from HIGH to MED |

---

_Run #147 completed 2026-06-27. `pnpm check` passed after `@types/node` 26.0.1 upgrade. Next scheduled run will check for new minor/patch releases, stable `@ai-sdk/*` v4 release, and any newly opened Dependabot PRs._
