# Dependabot Audit — Run 38 — 2026-06-09

**Result: 3 advisories resolved · 0 carry-forwards remaining · 2 packages upgraded · ALL advisories cleared**

---

## Open Native Dependabot PRs

**Zero.** Confirmed via GitHub API (`repo:moizj00/ttml-app author:app/dependabot is:open`): no PRs authored by `dependabot[bot]`. All dependency management is manual this cycle.

---

## Open Audit PRs Reviewed

| PR | Title | Decision | Reason |
|----|-------|----------|--------|
| [#150](https://github.com/moizj00/ttml-app/pull/150) | Run 37 — brace-expansion 5.0.6 + langsmith 0.7.5 (GHSA-jxxr + GHSA-3644 resolved) | ✅ **Safe to merge** | Safe patch/minor overrides; resolves 2 advisories; CVE-2025-68664 carry-forward correctly closed; TS clean; lockfile consistent |
| [#149](https://github.com/moizj00/ttml-app/pull/149) | Run 36 — @langchain/anthropic 1.4.0 | ✅ **Already merged** | Merged before this run |

---

## Packages Upgraded This Run

| Package | Before | After | Type | Reason |
|---------|--------|-------|------|--------|
| `fast-xml-builder` | 1.1.5 | **1.2.0** | Patch (override added) | Resolves GHSA-5wm8-gmm8-39j9 (HIGH) + GHSA-45c6-75p6-83cc (MODERATE) |
| `qs` | 6.14.2 | **6.15.2** | Patch (override added) | Resolves GHSA-q8mj-m7cp-5q26 (MODERATE) |

> Both are `pnpm.overrides` entries. No direct `package.json` dependency declarations were added.

---

## Advisories Resolved This Run

| Advisory | Severity | Package | Resolution |
|----------|----------|---------|------------|
| [GHSA-5wm8-gmm8-39j9](https://github.com/advisories/GHSA-5wm8-gmm8-39j9) | 🔴 HIGH | `fast-xml-builder` via `@aws-sdk` | Override `fast-xml-builder: >=1.1.7` → resolved to 1.2.0 ✅ |
| [GHSA-45c6-75p6-83cc](https://github.com/advisories/GHSA-45c6-75p6-83cc) | 🟠 MODERATE | `fast-xml-builder` via `@aws-sdk` | Same override → resolved to 1.2.0 ✅ |
| [GHSA-q8mj-m7cp-5q26](https://github.com/advisories/GHSA-q8mj-m7cp-5q26) | 🟠 MODERATE | `qs` via `express@4.22.1` | Override `qs: >=6.15.2` → resolved to 6.15.2 ✅ |

**GHSA-5wm8-gmm8-39j9 details:** `fast-xml-builder` allowed attribute values with unwanted quotes to bypass malicious attribute sanitization. Vulnerable: `<=1.1.6`. Fixed: `>=1.1.7`. This is AWS SDK internal XML serialization for S3 — not on user-supplied content — but the override cleanly eliminates the advisory with no compatibility risk.

**GHSA-45c6-75p6-83cc details:** `fast-xml-builder` Comment Value regex could be bypassed. Vulnerable: `=1.1.5`. Fixed: `>=1.1.6`. Same path as above — resolved by the same `>=1.1.7` override.

**GHSA-q8mj-m7cp-5q26 details:** `qs.stringify` crashes with TypeError on null/undefined entries in comma-format arrays when `encodeValuesOnly` is set. Vulnerable: `>=6.11.1 <=6.15.1`. Fixed: `>=6.15.2`. App uses `express.json()` body parsing (not `qs.stringify` with `encodeValuesOnly`) — practical risk was near-zero — but the override cleanly eliminates the advisory. 6.14.2 → 6.15.2 is a backward-compatible patch.

---

## Dependency Health Snapshot (post-run)

| Package | Lockfile | Status |
|---------|----------|--------|
| `@langchain/anthropic` | 1.4.0 | ✅ |
| `@langchain/openai` | 1.4.7 | ✅ |
| `@langchain/core` | 1.1.48 | ✅ |
| `@langchain/langgraph` | 1.2.9 | ✅ |
| `@langchain/langgraph-checkpoint-postgres` | 1.0.2 | ✅ |
| `@anthropic-ai/sdk` | 0.95.2 | ✅ |
| `langsmith` | 0.7.5 | ✅ |
| `brace-expansion` | 5.0.6 | ✅ |
| `fast-xml-builder` | **1.2.0** | ✅ GHSA-5wm8 + GHSA-45c6 resolved |
| `qs` | **6.15.2** | ✅ GHSA-q8mj resolved |
| `vite` | 8.0.16 | ✅ |
| `openai` | 6.39.0 | ✅ |
| `stripe` | 22.1.1 | ✅ |
| `react` | 19.2.5 | ✅ |
| `typescript` | 5.9.3 | ✅ |
| `zod` | 4.4.3 | ✅ |
| `puppeteer` | 24.43.1 | ✅ |
| `@types/node` | 24.13.1 | ✅ |

**`pnpm audit` result: No known vulnerabilities found** ✅

---

## Deferred Items (unchanged)

| Item | Priority | Reason |
|------|----------|--------|
| `@langchain/langgraph` 1.2.9 → 1.3.x | ⏸️ Deferred | Minor with new peer dep (`zod-to-json-schema`); needs dedicated PR + full graph testing |
| Puppeteer v24 → v25 | ⏸️ Deferred | ESM-only + Promise API break; needs dedicated PR + PDF smoke tests |
| TypeScript 5.9.3 → 6.x | ⏸️ Deferred | Major version; dedicated PR + `pnpm revalidate` |
| Express v4 → v5 | ⏸️ Deferred | Major migration; `qs` override now covers the advisory |
| `pnpm` v10 → v11 | ⏸️ Deferred | Major dev tool; evaluate separately |
| Stale audit PRs #98, #135, #137, #138, #146, #148 | 🗂️ Batch-close | Docs only; information superseded by committed `docs/` files |

---

## Validation

- `pnpm install`: ✅ clean (5 packages updated, no resolution errors)
- `pnpm audit`: ✅ **No known vulnerabilities found**
- Pre-existing peer warning: `@tiptap/pm 3.22.5` vs `@tiptap/core 3.26.0` — unchanged, unrelated to this run

---

https://claude.ai/code/session_01Ejxm94eJQCGNoMvEoFzvTL
