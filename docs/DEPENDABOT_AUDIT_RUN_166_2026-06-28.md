# Dependency Audit Run #166 — 2026-06-28

**Date:** 2026-06-28  
**Run:** #166  
**Branch:** `claude/intelligent-gates-570s3g`

---

## Executive Summary

| Metric | Result |
|--------|--------|
| Native Dependabot PRs (open) | **0** — `dependabot[bot]` has never opened a PR on this repo |
| CVEs (`pnpm audit`) | **0** ✅ |
| Total lockfile packages | **788** |
| Patch/minor updates available | **0** — all current after run #163 |
| Major upgrades available | **8** — all deferred (breaking changes) |
| Active `pnpm.overrides` CVE pins | **19** — all verified intact |

---

## Dependabot PR Investigation

### Finding: Zero native Dependabot PRs exist

GitHub search `is:pr is:open author:app/dependabot repo:moizj00/ttml-app` → **0 results**.

All 500+ PRs with "dependabot" or "Dependency Audit" in the title are **agent-generated audit reports** authored by `moizj00` via the Claude Code scheduled routine — not native Dependabot dependency bumps. GitHub's Dependabot bot (`dependabot[bot]`) has never opened a PR on this repository.

### Merge Decision: N/A

No native Dependabot PRs exist. No merge, defer, or close actions taken.

---

## `pnpm audit` — CVE Status

```
No known vulnerabilities found ✅
Total dependencies scanned: 788
```

### Active `pnpm.overrides` CVE Pins (19 — all verified intact in `package.json`)

| Override | Pin |
|----------|-----|
| `tailwindcss>nanoid` | `3.3.7` |
| `fast-xml-parser` | `5.7.2` |
| `esbuild` | `0.28.1` (patches HIGH + LOW CVEs) |
| `path-to-regexp` | `0.1.13` |
| `picomatch` | `4.0.4` |
| `brace-expansion` | `5.0.6` |
| `langsmith` | `>=0.6.0` |
| `fast-xml-builder` | `>=1.1.7` |
| `qs` | `>=6.15.2` |
| `@tootallnate/once` | `3.0.1` |
| `basic-ftp@<=5.2.1` | `>=5.2.2` |
| `basic-ftp@=5.2.0` | `>=5.2.1` |
| `dompurify@<=3.3.3` | `>=3.4.0` |
| `dompurify@<=3.4.10` | `>=3.4.11` |
| `@xmldom/xmldom` | `0.9.10` |
| `uuid` | `14.0.0` |
| `postcss@<8.5.10` | `>=8.5.10` |
| `form-data@<2.5.6` | `>=2.5.6` |
| `@opentelemetry/core@<2.8.0` | `>=2.8.0` |

> ⚠️ **Critical:** Do NOT upgrade pnpm to v11 before migrating all 19 pins to `pnpm-workspace.yaml` — v11 silently drops `pnpm.overrides`, re-exposing all pinned CVEs.

---

## `pnpm outdated` — Full Output

```
┌──────────────────────┬─────────┬────────┐
│ Package              │ Current │ Latest │
├──────────────────────┼─────────┼────────┤
│ @ai-sdk/anthropic    │ 3.0.85  │ 4.0.1  │
├──────────────────────┼─────────┼────────┤
│ @ai-sdk/openai       │ 3.0.74  │ 4.0.2  │
├──────────────────────┼─────────┼────────┤
│ @types/express (dev) │ 4.17.21 │ 5.0.6  │
├──────────────────────┼─────────┼────────┤
│ ai                   │ 6.0.208 │ 7.0.4  │
├──────────────────────┼─────────┼────────┤
│ express              │ 4.22.2  │ 5.2.1  │
├──────────────────────┼─────────┼────────┤
│ pnpm (dev)           │ 10.34.4 │ 11.9.0 │
├──────────────────────┼─────────┼────────┤
│ puppeteer            │ 24.43.1 │ 25.2.1 │
├──────────────────────┼─────────┼────────┤
│ typescript (dev)     │ 5.9.3   │ 6.0.3  │
└──────────────────────┴─────────┴────────┘
```

**All 8 outdated packages are major-version bumps.** No patch or minor updates are available.

---

## Deferred Major Upgrades — Decisions & Rationale

| Package | Current | Latest | Decision | Reason |
|---------|---------|--------|----------|--------|
| `typescript` | 5.9.3 | 6.0.3 | ⛔ DEFERRED | `"types": []` is now the default — strips implicit Node.js globals (`process`, `Buffer`, `__dirname`) from all `server/` files. Requires `"types": ["node"]` in server tsconfig first. |
| `ai` | 6.0.208 | 7.0.4 | ⛔ DEFERRED | ESM-only in v7; `require('ai')` fails. `generateText`/`streamText`/`generateObject` response shapes changed. Must upgrade atomically with `@ai-sdk/*@4` after full ESM migration. Affects live LangGraph pipeline (`server/pipeline/graph/nodes/`). |
| `@ai-sdk/anthropic` | 3.0.85 | 4.0.1 | ⛔ DEFERRED | Blocked on `ai@7` (peer dep). Cannot upgrade independently. |
| `@ai-sdk/openai` | 3.0.74 | 4.0.2 | ⛔ DEFERRED | Blocked on `ai@7` (peer dep). Cannot upgrade independently. |
| `express` | 4.22.2 | 5.2.1 | ⛔ DEFERRED | Query string parser replaced — nested object syntax (`?a[b]=c`) parsed differently. Risk: tRPC batch query regressions. Route matching semantics changed. |
| `@types/express` | 4.17.21 | 5.0.6 | ⛔ DEFERRED | Gated on Express 5 runtime migration. Type changes follow the runtime. |
| `pnpm` | 10.34.4 | 11.9.0 | ⛔ DEFERRED ⚠️ | v11 silently drops `pnpm.overrides` in `package.json`. Must migrate all 19 CVE pin entries to `pnpm-workspace.yaml` first, or `pnpm audit` will re-surface those CVEs. |
| `puppeteer` | 24.43.1 | 25.2.1 | ⛔ DEFERRED | ESM-only v25. Same blocker as `ai@7`. Used in production PDF generation (`server/draftPdfRoute.ts`). |

---

## Upgrade Readiness Blockers

```
ESM migration (server/) ──blocks──▶ ai@7, @ai-sdk/*@4, puppeteer@25
pnpm.overrides → pnpm-workspace.yaml ──blocks──▶ pnpm@11
Express 5 integration tests ──blocks──▶ express@5, @types/express@5
TypeScript server tsconfig audit ──blocks──▶ typescript@6
```

---

## Recommended Next Steps

| Priority | Action | Unblocks |
|----------|--------|---------|
| P1 | ESM migration sprint (convert `server/` or use dual-bundle strategy) | `ai@7`, `@ai-sdk/anthropic@4`, `@ai-sdk/openai@4`, `puppeteer@25` |
| P2 | Migrate `pnpm.overrides` → `pnpm-workspace.yaml` (19 entries) | `pnpm@11` |
| P3 | Express 5 integration test suite (validate tRPC batch queries + route matching) | `express@5`, `@types/express@5` |
| P4 | TypeScript 6 audit — add `"types": ["node"]` to server `tsconfig.json` | `typescript@6` |
| P5 | Close stale audit PRs #238–#516 (100+ open, all superseded) | PR hygiene |

---

## Stale PR Accumulation Warning

As of this run, **100+ agent-generated dependency audit PRs** are open on this repository (#96–#517). These are superseded by each successive run. None contain actual code changes that need review — they are documentation-only audit reports. Recommend bulk-closing all prior audit PRs (#96–#515) and keeping only the latest (#517 + this run #166) open for reference.

---

_Generated by Claude Code scheduled routine — 2026-06-28_
