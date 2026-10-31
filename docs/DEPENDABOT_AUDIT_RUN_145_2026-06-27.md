# Dependabot Audit Run #145 — 2026-06-27

## Executive Summary

Scheduled dependency audit run #145, executed 2026-06-27.

**Status: ✅ No-op — baseline clean (same as Run #144)**

| Metric | Result |
|--------|--------|
| Native Dependabot PRs | 0 |
| CVEs (`pnpm audit`) | 0 |
| Updates applied | 0 |
| Active `pnpm.overrides` CVE pins | 19 |
| Deferred major-version upgrades | 9 |

---

## Native Dependabot PR Audit

Scanned all 100 open PRs in `moizj00/ttml-app` via GitHub API. **Zero PRs** were authored by `dependabot[bot]`. All dependency management on this repository is handled by this scheduled Claude Code routine. No Dependabot PRs to review, merge, or close.

---

## CVE Audit

```
pnpm audit → No known vulnerabilities found ✅
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

All 9 remain deferred, unchanged from Run #144:

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

## Delta from Run #144

No changes. Runs #143, #144, and #145 are all no-op clean baselines on the same day (2026-06-27). The dependency graph is stable.

---

## Decision Log

| PR # | Package | Decision | Reason |
|------|---------|----------|--------|
| — | — | N/A | Zero native Dependabot PRs exist on this repository |

---

_Run #145 completed 2026-06-27. Next scheduled run will check for new minor/patch releases and any newly opened Dependabot PRs._
