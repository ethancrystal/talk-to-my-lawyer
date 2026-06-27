# Dependabot Audit Run #146 — 2026-06-27

## Executive Summary

Scheduled dependency audit run #146, executed 2026-06-27.

**Status: ✅ No-op — baseline clean (same as Run #145)**

| Metric | Result |
|--------|--------|
| Native Dependabot PRs | 0 |
| CVEs (`pnpm audit`) | 0 |
| Updates applied | 0 |
| Active `pnpm.overrides` CVE pins | 19 |
| Deferred major-version upgrades | 9 |

---

## Native Dependabot PR Audit

Scanned all open PRs in `moizj00/ttml-app` via GitHub API. **Zero PRs** were authored by `dependabot[bot]`. GitHub Dependabot has never opened a PR on this repository — all dependency management is handled by this scheduled Claude Code routine. No Dependabot PRs to review, merge, or close.

The 92 open `chore(deps):` PRs visible in the repository are **all authored by `moizj00`** and represent prior audit run reports from this routine (runs #70–#145, dating back to 2026-06-23).

---

## CVE Audit

```
pnpm audit → No known vulnerabilities found ✅
Total dependencies scanned: 786
Vulnerabilities: info=0, low=0, moderate=0, high=0, critical=0
```

All 19 `pnpm.overrides` CVE pins remain active:

| Override | Pinned to |
|----------|-----------|
| `tailwindcss>nanoid` | `3.3.7` |
| `fast-xml-parser` | `5.7.2` |
| `esbuild` | `0.28.1` |
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

> ⚠️ Do NOT upgrade `pnpm` to v11 before migrating the 19 overrides to `pnpm-workspace.yaml`. pnpm v11 silently drops all overrides.

---

## Minor/Patch Update Scan

`pnpm outdated` shows **only major-version gaps** — no safe minor/patch updates are available. The dependency baseline is fully current within each major version band.

---

## Deferred Major-Version Upgrades (9 packages)

All 9 remain deferred, unchanged from Run #145:

| Package | Current | Latest | Risk | Block Reason |
|---------|---------|--------|------|--------------|
| `typescript` | 5.9.3 | 6.0.3 | 🔴 HIGH | Breaking changes unreviewed; requires full type-check pass |
| `ai` | ^6.0.208 | 7.0.3 | 🔴 HIGH | ESM-only, API renames — atomic group upgrade with ai-sdk peers |
| `@ai-sdk/anthropic` | ^3.0.85 | 4.0.0 | 🔴 HIGH | Must co-upgrade with `ai@7` |
| `@ai-sdk/openai` | ^3.0.74 | 4.0.1 | 🔴 HIGH | Must co-upgrade with `ai@7` |
| `express` | ^4.22.2 | 5.2.1 | 🔴 HIGH | `req.param()` removed; 15+ route files affected |
| `@types/express` | 4.17.21 | 5.0.6 | 🔴 HIGH | Blocked on Express 5 migration |
| `pnpm` | ^10.34.4 | 11.9.0 | 🔴 HIGH | v11 drops all 19 CVE overrides silently |
| `puppeteer` | ^24.43.1 | 25.2.1 | 🔴 HIGH | `executablePath()` becomes async (ESM-only) |
| `@types/node` | ^24.13.1 | 26.0.1 | 🟡 MED | Node 22 runtime; v26 types expose non-existent APIs |

---

## Decision Log — Dependabot PR Decisions

| PR # | Package | Decision | Reason |
|------|---------|----------|--------|
| — | — | N/A | Zero native Dependabot PRs exist on this repository |

### Per-package decisions (major upgrades, all deferred)

**`typescript` 5.9.3 → 6.0.3** — ❌ DEFER  
TypeScript 6 removes legacy module resolution modes and tightens strict-mode rules. Would require a full `pnpm check` audit and likely type-annotation fixes across 100+ files. No urgency — no CVE, no feature need.

**`ai` 6.0.208 → 7.0.3** — ❌ DEFER  
Vercel AI SDK v7 is ESM-only and renames core exports (`generateText`, `streamText` signatures changed). Must be co-upgraded atomically with `@ai-sdk/anthropic@4` and `@ai-sdk/openai@4`. High blast radius across `server/pipeline/graph/nodes/`.

**`@ai-sdk/anthropic` 3.0.85 → 4.0.0** — ❌ DEFER  
Peer dependency of `ai@7`. Cannot be upgraded independently without breaking the AI SDK peer resolution.

**`@ai-sdk/openai` 3.0.74 → 4.0.1** — ❌ DEFER  
Same as above — blocked on atomic `ai@7` group upgrade.

**`express` 4.22.2 → 5.2.1** — ❌ DEFER  
Express 5 removes `req.param()`, changes async error-handler signatures, and alters routing. Requires audit of all 15+ `register*Route` modules and the REST surface documented in `CLAUDE.md`. A dedicated migration branch is the right vehicle.

**`@types/express` 4.17.21 → 5.0.6** — ❌ DEFER  
Type definitions track the Express 5 API. Blocked on Express 5 migration.

**`pnpm` 10.34.4 → 11.9.0** — ❌ DEFER  
pnpm v11 silently discards `pnpm.overrides` in `package.json`. All 19 CVE pins would be dropped without warning, exposing previously patched vulnerabilities. Migration requires moving every override to `pnpm-workspace.yaml` first, then upgrading.

**`puppeteer` 24.43.1 → 25.2.1** — ❌ DEFER  
Puppeteer 25 makes `executablePath()` async and is fully ESM. The PDF generation path (`server/draftPdfRoute.ts`) uses synchronous launch patterns. Needs targeted migration work.

**`@types/node` 24.13.1 → 26.0.1** — ❌ DEFER (medium risk)  
Node 26 types would expose APIs not available in the Node 22 runtime this project targets (CLAUDE.md: Node ≥22.12). Upgrading the types ahead of the runtime would introduce phantom type coverage for non-existent APIs.

---

## Delta from Run #145

No changes. This run (146) is the sixth consecutive no-op clean baseline on 2026-06-27, confirming the dependency graph is stable after Run #141 (pnpm CVE fix) and Run #142 (prettier 3.9.0 bump).

---

_Run #146 completed 2026-06-27. Next scheduled run will check for new minor/patch releases and any newly opened Dependabot PRs._
