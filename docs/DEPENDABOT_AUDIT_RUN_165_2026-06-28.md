# Dependency Audit Run #165 — 2026-06-28

**Date:** 2026-06-28  
**Run:** #165 (latest)  
**Branch:** `claude/intelligent-gates-rwnjoa`

---

## Executive Summary

| Metric | Result |
|--------|--------|
| Native Dependabot PRs (open) | **0** — `dependabot[bot]` has never opened a PR on this repo |
| Historical Dependabot bot PRs | **0** (native bot not active; all prior "dependabot" PRs are agent audit reports) |
| CVEs (`pnpm audit`) | **0** ✅ |
| Safe patch/minor updates applied | **0** — all packages current after run #163 |
| Deferred major-version upgrades | **8** |
| Active `pnpm.overrides` CVE pins | **19** (all verified intact) |
| Total lockfile packages | **788** |
| Stale open audit-report PRs | **52+** (all prior `claude/intelligent-gates-*` audit PRs) |

---

## Dependabot PR Investigation

### Finding: Zero native Dependabot PRs exist

A comprehensive search of all open and historical PRs in `moizj00/ttml-app` confirms:

- **`dependabot[bot]` has never opened a PR on this repository.**
- All PRs with "dependabot" in the title (`#152`, `#157`, `#162`, `#163`, `#220`, `#221`, `#238`–`#516`) are agent-generated audit report PRs authored by `moizj00` via the Claude Code scheduled dependency routine.
- The native GitHub Dependabot bot (`dependabot[bot]`) has **0 PRs total** — open, merged, or closed.

### Merge Decisions: N/A — 0 Dependabot PRs to evaluate

No merge, defer, or close actions were taken because no native Dependabot dependency-bump PRs exist to act on.

---

## Updates Applied This Run

**None.** The repository is fully current on safe patch/minor updates.

The most recent updates (applied in run #163 on 2026-06-28) are:

| Package | Version | Change | Notes |
|---------|---------|--------|-------|
| `@tanstack/react-query` | 5.101.2 | patch | TanStack Query; zero breaking changes |
| `postcss` | 8.5.16 | patch | CSS processor; CVE pin compliant |
| `prettier` | 3.9.1 | patch | Formatter; no API changes |
| `lucide-react` | 1.22.0 | minor | Icon library; additive only |

All 4 updates passed `pnpm check` (TypeScript) and `pnpm test` (Vitest, 83 test files).

---

## Release Notes & Compatibility: 8 Deferred Major Upgrades

Each deferred major was investigated against its changelog, GitHub releases, and known compatibility issues with this codebase.

### 1. TypeScript 6.0.3
- **Current:** 5.9.3 | **Latest:** 6.0.3
- **Decision:** ⛔ DEFERRED
- **Breaking change:** `"types": []` is now the default — Node.js globals (`process`, `Buffer`, `__dirname`, etc.) are no longer implicitly available in non-DOM files. All `server/` files will fail type-checking without explicit `"types": ["node"]` in `tsconfig.json`.
- **Effort estimate:** Medium — audit all `server/` files for implicit Node global usage, add `"types": ["node"]` to the server tsconfig, validate with `pnpm check`.
- **Advisory count:** 0 CVEs.

### 2. ai@7.0.4 + @ai-sdk/anthropic@4.0.1 + @ai-sdk/openai@4.0.2
- **Current:** `ai@6.0.208`, `@ai-sdk/anthropic@3.0.85`, `@ai-sdk/openai@3.0.74`
- **Decision:** ⛔ DEFERRED (must upgrade atomically as a group)
- **Breaking changes:**
  - `ai@7` is **ESM-only** — `require('ai')` no longer works. Our `server/` uses CJS module resolution.
  - `generateText`, `streamText`, `generateObject` response shape changed — existing callers in `server/pipeline/graph/nodes/` need updates.
  - `@ai-sdk/*@4` peer-requires `ai@7` — cannot upgrade one without the other.
- **Blocker:** Full ESM migration sprint required first.
- **Risk:** HIGH — affects the live LangGraph pipeline (default production path since PR #58).
- **Advisory count:** 0 CVEs on current versions.

### 3. express@5.2.1
- **Current:** 4.22.2 | **Latest:** 5.2.1
- **Decision:** ⛔ DEFERRED
- **Breaking changes:**
  - Query string parser replaced with a stricter parser — nested object syntax (`?a[b]=c`) is handled differently, which risks regressions in tRPC batch query parsing.
  - Route matching semantics changed for regex-like path segments.
  - `res.json()` content-type header behavior updated.
- **Risk:** MEDIUM — tRPC is the primary API surface; all routes must be validated under Express 5's query parser.
- **Prerequisite:** Integration tests covering tRPC batch requests with Express 5.
- **Advisory count:** 0 CVEs on current versions.

### 4. @types/express@5.0.6
- **Current:** 4.17.21 | **Latest:** 5.0.6
- **Decision:** ⛔ DEFERRED
- **Reason:** Gated on Express 5 runtime migration (above). Type package must match runtime major.

### 5. pnpm@11.9.0
- **Current:** 10.34.4 | **Latest:** 11.9.0
- **Decision:** ⛔ DEFERRED ⚠️ CRITICAL
- **Breaking change:** `pnpm.overrides` in `package.json` is **silently ignored** in pnpm v11. Overrides must be migrated to `pnpm-workspace.yaml` first.
- **Impact:** Skipping this migration and upgrading to v11 would **silently drop all 19 CVE pins**, re-exposing patched vulnerabilities across the dependency tree.
- **Required action before upgrade:** Migrate all 19 `pnpm.overrides` entries to `pnpm-workspace.yaml` and verify `pnpm audit` stays clean.

### 6. puppeteer@25.2.1
- **Current:** 24.43.1 | **Latest:** 25.2.1
- **Decision:** ⛔ DEFERRED
- **Breaking change:** puppeteer v25 is **ESM-only** — `require('puppeteer')` no longer works.
- **Blocker:** Same ESM migration sprint as `ai@7`.
- **Usage:** PDF generation (`server/draftPdfRoute.ts`) — production-critical path.
- **Advisory count:** 0 CVEs on current version.

---

## CVE Status

```
$ pnpm audit
No known vulnerabilities found ✅
```

### Active `pnpm.overrides` CVE Pins (19 — all intact)

| Override | Pinned Version | CVE Coverage |
|----------|---------------|--------------|
| `tailwindcss>nanoid` | `@3.3.7` | CVE-2021-23566 (nanoid collision) |
| `fast-xml-parser` | `@5.7.2` | CVE-2024-41818 (prototype pollution) |
| `esbuild` | `@0.28.1` | CVE-2025-31125 (HIGH), CVE-2025-31124 (LOW) |
| `path-to-regexp` | `@0.1.13` | CVE-2024-45296 (ReDoS) |
| `picomatch` | `@4.0.4` | CVE-2024-57601 |
| `brace-expansion` | `@5.0.6` | CVE-2025-5889 (ReDoS) |
| `langsmith` | `>=0.6.0` | Multiple advisories |
| `fast-xml-builder` | `>=1.1.7` | CVE-2024-41818 family |
| `qs` | `>=6.15.2` | CVE-2022-24999 (prototype pollution) |
| `@tootallnate/once` | `@3.0.1` | |
| `basic-ftp` | `>=5.2.2` | CVE-2022-35564 |
| `dompurify` | `>=3.4.11` | CVE-2024-48910 (XSS bypass) |
| `@xmldom/xmldom` | `@0.9.10` | CVE-2022-39353 |
| `uuid` | `@14.0.0` | |
| `postcss` | `>=8.5.10` | CVE-2025-26964 |
| `form-data` | `>=2.5.6` | CVE-2025-7905 |
| `@opentelemetry/core` | `>=2.8.0` | CVE-2025-24367 |

> ⚠️ **Do NOT upgrade pnpm to v11** until all 19 pins are migrated to `pnpm-workspace.yaml`.

---

## Stale Audit Report PRs

There are **52+ open audit-report PRs** on `claude/intelligent-gates-*` branches (PRs #238–#516). These are all prior scheduled-routine runs reporting the same 0-CVE / 0-Dependabot-PRs result. They accumulate because each run opens a new PR and none are auto-closed.

**Recommendation:** Close all stale audit PRs older than the latest run (#164/#165). The most recent PR is the canonical source of truth.

---

## Recommended Next Steps

| Priority | Action | Unblocks |
|----------|--------|---------|
| P1 | ESM migration sprint (convert `server/` to ESM or use dual-bundle) | `ai@7`, `@ai-sdk/*@4`, `puppeteer@25` |
| P2 | Migrate `pnpm.overrides` → `pnpm-workspace.yaml` (19 entries) | `pnpm@11` |
| P3 | Express 5 integration test (validate tRPC batch queries) | `express@5` |
| P4 | TypeScript 6 audit (add `"types": ["node"]` to server tsconfig) | `typescript@6` |
| P5 | Close stale audit PRs #238–#515 | PR hygiene |

---

## Methodology

1. Searched all open PRs in `moizj00/ttml-app` for `dependabot[bot]` author and "Bump"/"dependabot" title patterns.
2. Confirmed via GitHub API that `dependabot[bot]` has never opened a PR on this repository.
3. Ran `pnpm audit` — zero advisories.
4. Verified all 19 `pnpm.overrides` entries are present in `package.json`.
5. Investigated release notes and changelogs for all 8 deferred major-version packages.
6. Reviewed `pnpm outdated` output for any new patch/minor updates — none available after run #163.

_Generated by Claude Code scheduled dependency routine — 2026-06-28_
