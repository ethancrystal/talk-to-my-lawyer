# Dependabot Audit — Run 37 — 2026-06-09

**Result: 2 advisories resolved · 3 advisories closed (carry-forward correction) · 2 packages upgraded · 1 PR merged · 1 PR left unmerged**

---

## Open Native Dependabot PRs

**Zero.** Confirmed via GitHub API: no PRs authored by `dependabot[bot]`. All dependency management is manual this cycle.

---

## Open Audit PRs Reviewed

| PR | Title | Decision | Reason |
|----|-------|----------|--------|
| [#149](https://github.com/moizj00/ttml-app/pull/149) | Run 36 — @langchain/anthropic 1.4.0 (GHSA-p7fg resolved) | ✅ **MERGED** | Safe minor/patch bumps; resolves GHSA-p7fg-763f-g4gf; TS clean; tests pass |
| [#148](https://github.com/moizj00/ttml-app/pull/148) | Run 36 — docs audit report | ⏸️ **Left unmerged** | Stale docs-only PR; superseded by this run's documentation |

---

## Packages Upgraded This Run

### Direct overrides updated in `pnpm.overrides`

| Package | Before | After | Type | Reason |
|---------|--------|-------|------|--------|
| `brace-expansion` | 5.0.5 | **5.0.6** | Patch | Resolves GHSA-jxxr-4gwj-5jf2 (moderate DoS) |
| `langsmith` | 0.5.20 | **0.7.5** | Minor | Resolves GHSA-3644-q5cj-c5c7 (untrusted manifest deserialization) |

> Both are `pnpm.overrides` entries; no `package.json` direct dependency declarations were added.

---

## Advisories Resolved This Run

| Advisory | Severity | Package | Resolution |
|----------|----------|---------|------------|
| [GHSA-jxxr-4gwj-5jf2](https://github.com/advisories/GHSA-jxxr-4gwj-5jf2) | 🟠 MODERATE | `brace-expansion` via `@sentry/node` | Override bumped from `5.0.5` → `5.0.6` ✅ |
| [GHSA-3644-q5cj-c5c7](https://github.com/advisories/GHSA-3644-q5cj-c5c7) | 🟠 MODERATE | `langsmith@0.5.20` via `@langchain/core` | Override added `langsmith: >=0.6.0`; resolves to `0.7.5` ✅ |

**GHSA-jxxr-4gwj-5jf2 details:** Numeric range expansion in `brace-expansion` allocated the full intermediate array before applying the `max` guard, causing ~505 MB allocation for a single `{1..10000000}` expansion. 5.0.6 applies the guard early. This path is used by Sentry's glob instrumentation and is not directly user-facing.

**GHSA-3644-q5cj-c5c7 details:** `langsmith`'s `pullPrompt()` deserialized untrusted hub manifests without a trust-boundary warning. The pipeline does not call `pullPrompt()`, so practical risk was near-zero — but the override cleanly eliminates the advisory.

---

## Carry-Forward Correction: @langchain/core CVE-2025-68664 / CVE-2025-68665 — CLOSED

> **Previous runs (28–36) incorrectly listed this as an open HIGH carry-forward item requiring `@langchain/core >= 1.2.5`. That threshold applied to the Python package only.**

For the JavaScript/TypeScript npm package, the fix shipped in **`@langchain/core@1.1.8`** (GHSA-r399-636x-v7f6 / CVE-2025-68665). The project has been at `@langchain/core@1.1.48` since PR #133, which is `>= 1.1.8` and therefore **already patched**.

| CVE | JS fix version | Current version | Status |
|-----|---------------|-----------------|--------|
| CVE-2025-68664 / CVE-2025-68665 | `>= 1.1.8` | `1.1.48` | ✅ **Already fixed — carry-forward closed** |

---

## Remaining Advisories (3 — all transitive / vendor-controlled)

| Advisory | Severity | Package (transitive) | Fix path | Action |
|----------|----------|----------------------|----------|--------|
| [GHSA-5wm8-gmm8-39j9](https://github.com/advisories/GHSA-5wm8-gmm8-39j9) | 🔴 HIGH | `fast-xml-parser` via `@aws-sdk` | Vendor must update | 🟡 Monitor |
| [GHSA-45c6-75p6-83cc](https://github.com/advisories/GHSA-45c6-75p6-83cc) | 🟠 MODERATE | `fast-xml-parser` via `@aws-sdk` | Vendor must update | 🟡 Monitor |
| [GHSA-q8mj-m7cp-5q26](https://github.com/advisories/GHSA-q8mj-m7cp-5q26) | 🟠 MODERATE | `qs` via `express@4.21.2` | Express v5 migration | 🟡 Monitor |

### Why practical risk is low

- **fast-xml-parser** (2 advisories): AWS SDK internal S3 XML serialization path, not on user-supplied content
- **qs**: `qs.stringify` crash with `encodeValuesOnly` on comma-format arrays — app uses `express.json()` body parsing, not this code path

---

## Dependency Health Snapshot (post-run)

| Package | Lockfile | Status |
|---------|----------|--------|
| `@langchain/anthropic` | 1.4.0 | ✅ |
| `@langchain/openai` | 1.4.7 | ✅ |
| `@langchain/core` | 1.1.48 | ✅ CVE-2025-68664 fixed (≥ 1.1.8 confirmed) |
| `@langchain/langgraph` | 1.2.9 | ✅ |
| `@langchain/langgraph-checkpoint-postgres` | 1.0.2 | ✅ |
| `@anthropic-ai/sdk` | 0.98.0 | ✅ |
| `langsmith` | **0.7.5** | ✅ GHSA-3644 resolved |
| `brace-expansion` | **5.0.6** | ✅ GHSA-jxxr resolved |
| `vite` | 8.0.16 | ✅ |
| `openai` | 6.39.0 | ✅ |
| `stripe` | 22.1.1 | ✅ |
| `react` | 19.2.5 | ✅ |
| `typescript` | 5.9.3 | ✅ |
| `zod` | 4.4.3 | ✅ |
| `puppeteer` | 24.43.1 | ✅ |
| `@types/node` | 24.13.1 | ✅ |

---

## Deferred Items

| Item | Priority | Reason |
|------|----------|--------|
| `@langchain/langgraph` 1.2.9 → 1.3.x | ⏸️ Deferred | Minor with new peer dep (`zod-to-json-schema`); needs dedicated PR + full graph testing |
| Puppeteer v24 → v25 | ⏸️ Deferred | ESM-only + Promise API break; needs dedicated PR + PDF smoke tests |
| TypeScript 5.9.3 → 6.x | ⏸️ Deferred | Major version; dedicated PR + `pnpm revalidate` |
| Express v4 → v5 | ⏸️ Deferred | Major migration; would fix `qs` advisory (GHSA-q8mj-m7cp-5q26) |
| `pnpm` v10 → v11 | ⏸️ Deferred | Major dev tool; evaluate separately |
| Stale audit PRs #98, #135, #137, #138, #146, #148 | 🗂️ Batch-close | Docs only; information superseded by committed `docs/` files |

---

## Validation

- `pnpm install`: ✅ clean (6 packages updated, no resolution errors)
- Pre-existing peer warning: `@tiptap/pm 3.22.5` vs `@tiptap/core 3.26.0` peer expectation — unchanged, not related to this run

---

https://claude.ai/code/session_01ETcUABZeju8EdkPJAEE4H6
