# Dependabot Audit Run #164 — 2026-06-28

## Summary Metrics

| Metric | Result |
|--------|--------|
| Open Dependabot PRs | **0** — nothing to merge or close |
| Total historical bot PRs | **49** (all closed / merged) |
| CVEs (`pnpm audit`) | **0** ✅ |
| Safe updates applied this run | **0** (all already current from run #163) |
| Deferred major-version upgrades | **8** |
| Active `pnpm.overrides` CVE pins | **19** |
| Total lockfile packages | **788** |

---

## Dependabot PR Investigation

**No open Dependabot PRs.** All 49 historical GitHub Dependabot PRs are closed or merged. No new ones have been opened since run #163 (also 2026-06-28 earlier today).

### Decision for Each PR

Since Dependabot has not opened any new PRs, there are no merge / leave decisions to record this run. The 49 historical PRs were all handled in prior runs:

- **Merged** — patch and minor updates that passed `pnpm check` and `pnpm audit` cleanly (the majority).
- **Closed / superseded** — PRs that landed duplicate changes or were overtaken by manual updates in the same run.

---

## Package Update Status

### Patch / Minor (safe window) — all current

The 4 updates applied in run #163 are still the latest available:

| Package | Version | Type | Status |
|---------|---------|------|--------|
| `@tanstack/react-query` | 5.101.2 | patch | ✅ Up to date |
| `postcss` | 8.5.16 | patch | ✅ Up to date |
| `prettier` | 3.9.1 | patch | ✅ Up to date |
| `lucide-react` | 1.22.0 | minor | ✅ Up to date |

`pnpm outdated` today returns only the 8 intentionally-deferred major upgrades (see below).

### No new safe updates available

A fresh `pnpm outdated` run (2026-06-28 17:45 UTC) shows no patch or minor releases beyond what is already installed. Nothing to apply this run.

---

## 8 Deferred Major Upgrades — Intentionally Held Back

Each major upgrade requires a dedicated migration sprint with integration testing. **Do not apply these without a planned migration.**

| Package | Current | Latest | Blocker | Risk Level |
|---------|---------|--------|---------|------------|
| `typescript` | 5.9.3 | 6.0.3 | `types:[]` default drops Node globals — requires explicit `types` audit across `server/` | Medium |
| `ai` | 6.0.208 | 7.0.4 | ESM-only build; CJS server is a hard blocker; must upgrade atomically with `@ai-sdk/*@4` peers | High |
| `@ai-sdk/anthropic` | 3.0.85 | 4.0.1 | Blocked on `ai@7` ESM migration | High |
| `@ai-sdk/openai` | 3.0.74 | 4.0.2 | Blocked on `ai@7` ESM migration | High |
| `express` | 4.22.2 | 5.2.1 | Query parser breaking change — may break tRPC batch queries; requires full integration test suite | High |
| `@types/express` | 4.17.21 | 5.0.6 | Gated on Express 5 migration | Low (types-only) |
| `pnpm` | 10.34.4 | 11.9.0 | v11 silently discards `pnpm.overrides` → **must** migrate all 19 CVE pins to `pnpm-workspace.yaml` first | Critical |
| `puppeteer` | 24.43.1 | 25.2.1 | ESM-only in v25; bundle with `ai@7` ESM sprint | High |

### Merge Decision for Each Major

| Package | Decision | Reason |
|---------|----------|--------|
| `typescript@6` | **DEFERRED** | `types:[]` default change breaks implicit Node globals in `server/`. Requires explicit `types` additions across the whole backend. Not safe without a targeted migration. |
| `ai@7` | **DEFERRED** | Hard ESM-only build breaks the CJS Express server. Must upgrade atomically with `@ai-sdk/anthropic@4` and `@ai-sdk/openai@4`. Requires a full ESM migration sprint. |
| `@ai-sdk/anthropic@4` | **DEFERRED** | Blocked on `ai@7`. |
| `@ai-sdk/openai@4` | **DEFERRED** | Blocked on `ai@7`. |
| `express@5` | **DEFERRED** | Breaking query parser change risks tRPC batch query regressions. Integration test required before merging. Risky without a migration sprint. |
| `@types/express@5` | **DEFERRED** | Gated on Express 5 merge. |
| `pnpm@11` | **DEFERRED** | **Critical** — v11 silently drops `pnpm.overrides`, re-exposing all 19 CVE pins. Must migrate overrides to `pnpm-workspace.yaml` BEFORE upgrading. |
| `puppeteer@25` | **DEFERRED** | ESM-only in v25. Blocked until the ESM migration sprint resolves `ai@7`. |

---

## CVE Status

```
pnpm audit → No known vulnerabilities found ✅
```

> ⚠️ **Do NOT upgrade pnpm to v11** without first migrating all 19 `pnpm.overrides` entries to `pnpm-workspace.yaml`. v11 silently discards the overrides section, re-exposing all patched CVEs.

### Active `pnpm.overrides` CVE Pins (19)

| Override | Pinned To | Guards Against |
|----------|-----------|----------------|
| `tailwindcss>nanoid` | `3.3.7` | Nanoid entropy vulnerability |
| `fast-xml-parser` | `5.7.2` | ReDoS / XXE in XML parsing |
| `esbuild` | `0.28.1` | Development server exposure (CVE-2025-31125) |
| `path-to-regexp` | `0.1.13` | ReDoS vulnerability |
| `picomatch` | `4.0.4` | Glob pattern matching issue |
| `brace-expansion` | `5.0.6` | ReDoS in brace expansion |
| `langsmith` | `>=0.6.0` | Upstream LangSmith security fix |
| `fast-xml-builder` | `>=1.1.7` | XML builder vulnerability |
| `qs` | `>=6.15.2` | Prototype pollution |
| `@tootallnate/once` | `3.0.1` | Dependency chain fix |
| `basic-ftp@<=5.2.1` | `>=5.2.2` | FTP security fix |
| `basic-ftp@=5.2.0` | `>=5.2.1` | FTP security fix |
| `dompurify@<=3.3.3` | `>=3.4.0` | XSS bypass |
| `dompurify@<=3.4.10` | `>=3.4.11` | XSS bypass (updated) |
| `@xmldom/xmldom` | `0.9.10` | XML parsing vulnerability |
| `uuid` | `14.0.0` | UUID generation security fix |
| `postcss@<8.5.10` | `>=8.5.10` | PostCSS parsing vulnerability |
| `form-data@<2.5.6` | `>=2.5.6` | Form data security fix |
| `@opentelemetry/core@<2.8.0` | `>=2.8.0` | OpenTelemetry security fix |

---

## Release Notes Investigation

Research on the 8 deferred major upgrades (release notes, advisories, breaking changes):

### TypeScript 6.0.3
- **Breaking**: `types:[]` is now the default in `tsconfig.json` — Node.js globals (`process`, `Buffer`, etc.) are no longer implicitly available. All `server/` files relying on implicit Node types will fail compilation.
- **Action needed**: Audit `server/` for implicit Node globals; add `"types": ["node"]` entries where needed.
- **Source**: [TypeScript 6.0 Release Notes](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)

### ai@7.0.4 + @ai-sdk/* 4.x
- **Breaking**: ESM-only distribution. CommonJS `require()` no longer works.
- **Breaking**: `generateText`, `streamText`, and `generateObject` API surface changes — response shape differs.
- **Action needed**: Full ESM migration of `server/` before applying. All three packages (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`) must be upgraded atomically.
- **Source**: Vercel AI SDK v4 migration guide.

### Express 5.2.1
- **Breaking**: Query string parser changed from `qs` v6 to a stricter built-in parser. Nested objects (`foo[bar]=baz`) are parsed differently — may break tRPC batch query encoding.
- **Breaking**: Route matching semantics changed for regex-like path patterns.
- **Action needed**: Run full tRPC integration tests against Express 5 before merging. Pay special attention to the `trpc.handler` batch endpoint.
- **Source**: [Express 5 Migration Guide](https://expressjs.com/en/guide/migrating-5.html)

### pnpm 11.9.0
- **Breaking**: `pnpm.overrides` in `package.json` is no longer supported — replaced by `overrides` in `pnpm-workspace.yaml`.
- **Impact**: All 19 CVE pins would be silently dropped, re-exposing patched vulnerabilities.
- **Action needed**: Migrate all 19 entries to `pnpm-workspace.yaml` `overrides` block before upgrading pnpm.
- **Source**: [pnpm v11 Release Notes](https://github.com/pnpm/pnpm/releases/tag/v11.0.0)

### puppeteer 25.2.1
- **Breaking**: ESM-only module. `require('puppeteer')` is no longer supported.
- **Impact**: Blocked by the same ESM migration sprint as `ai@7`.
- **Action needed**: Part of the ESM migration sprint; upgrade together with `ai@7`.

---

## Recommended Next Steps (Priority Order)

1. **ESM migration sprint** (unblocks `ai@7`, `@ai-sdk/*@4`, `puppeteer@25`)
   - Convert `server/` entry points to ESM or use a dual-CJS/ESM build strategy
   - Update `esbuild` bundles in `package.json` scripts accordingly
   - Estimated effort: 2–3 days

2. **pnpm overrides migration** (unblocks `pnpm@11`)
   - Move all 19 `pnpm.overrides` entries in `package.json` to `pnpm-workspace.yaml`
   - Verify with `pnpm audit` after migration
   - Estimated effort: 1–2 hours

3. **Express 5 integration test** (unblocks `express@5`, `@types/express@5`)
   - Run full Playwright e2e suite against Express 5
   - Focus on tRPC batch queries and any query-string-heavy endpoints
   - Estimated effort: 1 day

4. **TypeScript 6 migration** (unblocks `typescript@6`)
   - Audit all `server/` files for implicit Node globals
   - Add explicit `"types": ["node"]` entries where needed
   - Run `pnpm check` to validate clean compilation
   - Estimated effort: 1–2 days

5. **Node 26 Docker watch**
   - Schedule base image bump when Node 26 reaches LTS (estimated late 2026)

---

## Prior Run History (Recent)

| Run | Date | Updates | CVEs | Notes |
|-----|------|---------|------|-------|
| #163 | 2026-06-28 | 4 (patch/minor) | 0 | `@tanstack/react-query`, `postcss`, `prettier`, `lucide-react` |
| #162 | 2026-06-28 | 0 | 0 | No new updates available |
| #161 | 2026-06-28 | 0 | 0 | No new updates available |
| #149 | 2026-06-27 | 0 | 0 | No new updates available |
| #148 | 2026-06-27 | 0 | 0 | No new updates available |

---

_Generated by [Claude Code](https://claude.ai/code) — Dependabot Audit Run #164 — 2026-06-28_
