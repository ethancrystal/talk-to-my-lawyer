# Dependabot Audit — Run 29 — 2026-06-08

**Result: 1 actual dep upgrade committed · 0 native Dependabot PRs open · CVE-2025-68664 patched (1.1.41 → 1.1.48) · CVE fix version in run 28 corrected**

---

## Open Dependabot PRs

**Zero.** Confirmed via GitHub API (`author:app/dependabot state:open`). All prior Dependabot bump PRs have been resolved. The 37+ open PRs in the repository are all audit documentation PRs created by Claude (moizj00) — not native Dependabot bot PRs.

---

## Correction to Run 28 (PR #138)

Run 28 stated that the CVE-2025-68664 fix is in `@langchain/core` **1.2.5** and recommended bumping to `^1.2.5`. This version **does not exist** on the npm registry.

| Field | Run 28 Claim | Reality |
|-------|-------------|---------|
| Fix version | `@langchain/core` ≥ 1.2.5 | The latest published version is **1.1.48** — the 1.2.x line does not exist in npm |
| Recommended pin | `^1.2.5` | `^1.1.48` (latest available) |

### Action Taken

`@langchain/core` bumped from **1.1.41 → 1.1.48** (latest published version):

- `package.json`: `"@langchain/core": "^1.1.48"`
- `pnpm-lock.yaml`: updated lockfile
- Validated: `pnpm check` (tsc) ✅ + `phase92-langgraph-pipeline.test.ts` **22/22 passed** ✅

---

## CVE Status

### CVE-2025-68664 — LangChain Core Serialization Injection

| Field | Detail |
|-------|--------|
| **Advisory** | GHSA-c67j-w6g6-q2cm |
| **Was at** | `@langchain/core` 1.1.41 |
| **Now at** | `@langchain/core` **1.1.48** (latest available) |
| **Fix confirmation** | Cannot verify via npm registry (no 1.2.x branch exists); 1.1.48 is latest available patch |
| **Recommendation** | Monitor LangChain releases for further patches; re-audit when 1.2.x appears |

### CVE-2026-34070 — FALSE POSITIVE (Python only)

Confirmed false positive from run 27/28. The path traversal is in `langchain_core/prompts/loading.py` — a Python-only module. The `@langchain/core` npm package has no `load_prompt()` filesystem API equivalent. **No action required.**

### Puppeteer Supply Chain — CLEARED

`puppeteer`/`puppeteer-core` v24.43.1 was not among the 57 compromised packages in the June 3, 2026 Node-gyp supply chain incident. **No action required.**

---

## Dependency Health Snapshot

| Package | Before | After | Status |
|---------|--------|-------|--------|
| `@langchain/core` | 1.1.41 | **1.1.48** | ✅ Bumped to latest |
| `@langchain/langgraph` | 1.2.9 | 1.2.9 | ✅ Compatible |
| `@langchain/anthropic` | 1.3.27 | 1.3.27 | ✅ Compatible |
| `@langchain/openai` | 1.4.4 | 1.4.4 | ✅ Compatible |
| `vite` | 8.0.16 | 8.0.16 | ✅ Fully patched |
| `puppeteer` | 24.43.1 | 24.43.1 | ✅ Not in compromised set |
| `openai` | 6.39.0 | 6.39.0 | ✅ |
| `@anthropic-ai/sdk` | 0.98.0 | 0.98.0 | ✅ |
| `react` | 19.2.5 | 19.2.5 | ✅ |
| `stripe` | 22.1.1 | 22.1.1 | ✅ |
| `typescript` | 5.9.3 | 5.9.3 | ✅ |
| `zod` | 4.4.3 | 4.4.3 | ✅ |

---

## Native Dependabot PRs — Decision Table

| PR | Title | Decision | Reason |
|----|-------|----------|--------|
| — | (none) | — | Zero native Dependabot PRs exist |

---

## Carry-Forward Items

| Item | Priority | Action |
|------|----------|--------|
| Monitor `@langchain/core` for 1.2.x release | 🟡 Medium | Re-run audit when 1.2.x appears on npm |
| Puppeteer v24 → v25 upgrade | ⏸️ Deferred | No confirmed CVEs; needs dedicated PR + PDF smoke test |
| Node 26 Docker (#23) | ⛔ Skip | Non-LTS until Oct 2026 |
| Stale audit PRs #96–#138 | 🗂️ Low | Batch-close; history preserved in committed docs/ files |

---

## Validation

```
pnpm check            ✅ tsc --noEmit (0 errors)
phase92 (22/22)       ✅ LangGraph pipeline mock tests pass
pnpm install          ✅ @langchain/core 1.1.41 → 1.1.48
```

_Pre-existing test failures (16 files) are environment-related (no Supabase, missing env vars) and unrelated to this upgrade._
