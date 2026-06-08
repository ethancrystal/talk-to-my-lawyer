# Dependabot Audit — Run 28 — 2026-06-08

**Result: 0 merged · 0 native Dependabot PRs open · CVE-2025-68664 confirmed (JS) · CVE-2026-34070 FALSE POSITIVE (Python only) · Puppeteer supply chain CLEARED**

---

## Summary

No native `dependabot[bot]` PRs exist in the repository. This run is a **correction run** against Run 27 (PR #137):

| Run 27 Finding | Run 28 Verdict |
|----------------|----------------|
| CVE-2025-68664 (`@langchain/core`) — CVSS 9.3 | ✅ **Confirmed** — JS package is affected; fixed in 1.2.5 |
| CVE-2026-34070 (`@langchain/core`) — CVSS 7.5 | ❌ **FALSE POSITIVE** — Python-only (`langchain_core/prompts/loading.py`); JS package unaffected |
| Puppeteer v24.43.1 supply chain warning | ✅ **CLEARED** — v24.43.1 is not in the confirmed compromised set |

**Net action item:** A single dedicated PR to bump `@langchain/core` from `1.1.41` → `≥ 1.2.5` (fixes the one real CVE).

---

## Open Dependabot PRs

**Zero.** Confirmed via `mcp__github__search_pull_requests` (author:app/dependabot, state:open). All prior Dependabot PRs have been closed or merged.

---

## Corrected Security Findings

### ✅ CVE-2025-68664 — Confirmed (JS Package Affected)

| Field | Detail |
|-------|--------|
| **Severity** | Critical — CVSS 9.3 |
| **Advisory** | GHSA-c67j-w6g6-q2cm |
| **Affects** | `@langchain/core` (npm) ≥ 1.0.0 and < 1.2.5 |
| **Fixed in** | 1.2.5 (npm) |
| **Lockfile version** | **1.1.41 — VULNERABLE** |
| **Mechanism** | `dumps()` / `dumpd()` do not escape dicts containing the `lc` key (LangChain's internal object marker). Attacker-controlled data that flows through serialization (e.g., via LLM response fields `additional_kwargs` or `response_metadata`) can be deserialized as a first-class LangChain object. Default `secrets_from_env=True` pre-patch enables exfiltration of `process.env` secrets; class instantiation can achieve RCE. |
| **Attack path in this repo** | LangGraph pipeline in `server/pipeline/graph/nodes/` uses LangChain for AI orchestration. The pipeline does not call `dumps()`/`dumpd()` on attacker-controlled inputs, but the serialization path runs during streaming operations on LLM responses — which an adversary can influence via prompt injection. Risk is **Medium** in practice; CVSS 9.3 reflects worst-case. |
| **Decision** | 🔴 **Must patch** — bump `@langchain/core` to ≥ 1.2.5 in a dedicated PR |

**Sources:**
- [GHSA-c67j-w6g6-q2cm](https://github.com/advisories/GHSA-c67j-w6g6-q2cm)
- [NVD CVE-2025-68664](https://nvd.nist.gov/vuln/detail/CVE-2025-68664)
- [Cyata: LangGrinch analysis](https://cyata.ai/blog/langgrinch-langchain-core-cve-2025-68664/)

---

### ❌ CVE-2026-34070 — FALSE POSITIVE (Python Only)

| Field | Detail |
|-------|--------|
| **Severity** | High — CVSS 7.5 (for the Python package) |
| **Affected package** | `langchain-core` on PyPI (Python) |
| **JS package status** | **Not affected** — the vulnerability is in `langchain_core/prompts/loading.py`, a Python-only module. The `@langchain/core` npm package has no equivalent filesystem-based `load_prompt()` API. |
| **Run 27 error** | Run 27 incorrectly attributed this Python CVE to the JS npm package `@langchain/core`. The GHSA and Snyk advisories are catalogued against the PyPI package. |
| **Decision** | ✅ **No action required** — not applicable to this project |

**Sources:**
- [SNYK-PYTHON-LANGCHAINCORE-15809257](https://security.snyk.io/vuln/SNYK-PYTHON-LANGCHAINCORE-15809257)
- [GitLab Advisory: CVE-2026-34070](https://advisories.gitlab.com/pkg/pypi/langchain-core/CVE-2026-34070/)
- [SentinelOne: CVE-2026-34070](https://www.sentinelone.com/vulnerability-database/cve-2026-34070/)

---

### ✅ Puppeteer v24.43.1 — Supply Chain Warning CLEARED

| Field | Detail |
|-------|--------|
| **Incident** | Node-gyp Supply Chain Compromise ("Phantom Gyp / Miasma Worm") — June 3, 2026 |
| **Scope** | 57 npm packages, 286+ malicious versions; self-propagating worm via `binding.gyp` at install time |
| **Confirmed affected packages** | `@vapi-ai/server-sdk`, `ai-sdk-ollama`, packages from maintainers `jagreehal`, `autotel`, `awaitly`, `executable-stories`, `node-env-resolver`, `wrangler-deploy` families |
| **Puppeteer status** | `puppeteer-core` v24.43.1 is **not listed** in any confirmed compromised version set. Puppeteer was mentioned in initial researcher reports as a reference example, not as a victim. |
| **Run 27 error** | Run 27 flagged this as "UNCONFIRMED for v24.43.1" and recommended urgent action; research confirms it is a false alarm for this version. |
| **Decision** | ✅ **No action required** — v24.43.1 is not compromised. Planned v24 → v25 upgrade remains deferred (no confirmed CVEs). |

**Sources:**
- [Snyk: Node-gyp Supply Chain Compromise](https://snyk.io/blog/node-gyp-supply-chain-compromise-self-propagating-npm-worm-binding-gyp/)
- [StepSecurity: Phantom Gyp Miasma Worm](https://www.stepsecurity.io/blog/binding-gyp-npm-supply-chain-attack-spreads-like-worm)
- [Corgea: Phantom Gyp Affected Packages](https://corgea.com/research/miasma-phantom-gyp-npm-worm-vapi-ai-sdk-ollama-june-2026)

---

## Dependency Health Snapshot

| Package | `package.json` range | Lockfile | Status |
|---------|---------------------|----------|--------|
| `@langchain/core` | `^1.1.41` | **1.1.41** | 🔴 CVE-2025-68664 (CVSS 9.3) — bump to ≥ 1.2.5 |
| `@langchain/langgraph` | `^1.2.9` | 1.2.9 | ✅ Compatible with @langchain/core 1.2.x |
| `@langchain/anthropic` | `^1.3.27` | 1.3.27 | ✅ Compatible with @langchain/core 1.2.x |
| `@langchain/openai` | `^1.4.4` | 1.4.4 | ✅ Compatible with @langchain/core 1.2.x |
| `@langchain/langgraph-checkpoint-postgres` | `^1.0.1` | 1.0.1 | ✅ Compatible with @langchain/core 1.2.x |
| `vite` | `^8.0.16` | 8.0.16 | ✅ Fully patched (CVE-2026-39363/39364) |
| `puppeteer` | `^24.43.1` | 24.43.1 | ✅ Not in compromised set |
| `typescript` | `5.9.3` (exact) | 5.9.3 | ✅ |
| `react` / `react-dom` | `^19.2.5` | 19.2.5 | ✅ |
| `openai` | `^6.39.0` | 6.39.0 | ✅ |
| `@anthropic-ai/sdk` | `^0.98.0` | 0.98.0 | ✅ |
| `stripe` | `^22.1.1` | 22.1.1 | ✅ |
| `zod` | `^4.4.3` | 4.4.3 | ✅ |
| `@types/node` | `^24.13.1` | 24.13.1 | ✅ |
| `@ai-sdk/anthropic` | `^3.0.74` | 3.0.74 | ✅ |
| `@ai-sdk/openai` | `^3.0.64` | 3.0.64 | ✅ |
| `framer-motion` | `^12.38.0` | 12.38.0 | ✅ |

---

## Upgrade Plan — @langchain/core 1.1.41 → ≥ 1.2.5

**Why 1.2.5 minimum (not 1.2.22):** CVE-2026-34070 is Python-only and does not apply here. The only actionable fix target is CVE-2025-68664, fixed in 1.2.5. Pinning to 1.2.22 adds unnecessary risk of unrelated breaking changes.

**Peer dependency compatibility:** All LangChain peer packages (`@langchain/anthropic`, `@langchain/openai`, `@langchain/langgraph`, `@langchain/langgraph-checkpoint-postgres`) declare `@langchain/core` as a peer dependency, not a direct dependency. They are compatible with `@langchain/core` 1.2.x — no lockstep version bumps required for the peer packages themselves. The `package.json` range change is only on `@langchain/core`.

**Required change:**
```json
// package.json — change:
"@langchain/core": "^1.1.41"
// to:
"@langchain/core": "^1.2.5"
```

**Validation gate:**
```bash
pnpm install
pnpm check      # tsc --noEmit
pnpm test       # vitest — especially phase92-langgraph-pipeline.test.ts
```

**Not applied in this run** — this is a documentation/audit run. Open a dedicated `chore(deps): @langchain/core 1.1.41 → 1.2.5 (CVE-2025-68664)` PR.

---

## Carry-Forward Items

| Item | Priority | Action |
|------|----------|--------|
| `@langchain/core` → ≥ 1.2.5 | 🔴 **High** | Dedicated chore PR; update `package.json` range + `pnpm install` |
| Puppeteer v24 → v25 upgrade | ⏸️ Deferred | No confirmed CVEs; needs dedicated PR + PDF smoke test |
| Node 26 Docker (#23) | ⛔ Skip | Non-LTS until Oct 2026 |
| Stale audit PRs #96–#137 | 🗂️ 42 open | Batch-close; history in committed docs files |

---

## Decision Summary

| Finding | Decision | Reason |
|---------|----------|--------|
| CVE-2025-68664 (`@langchain/core` < 1.2.5) | 🔴 **Must patch** — dedicated PR | CVSS 9.3; serialization injection affects JS package |
| CVE-2026-34070 (`@langchain/core` Python) | ✅ **No action** — false positive | Python-only; `@langchain/core` npm package unaffected |
| Puppeteer v24.43.1 supply chain | ✅ **Cleared** | v24.43.1 not in confirmed compromised package list |
| Puppeteer v24 → v25 upgrade | ⏸️ **Defer** | No confirmed CVEs; major bump warrants dedicated PR |
| Node 26 Docker (#23) | ⛔ **Skip** | Non-LTS until Oct 2026 |
| 0 open Dependabot PRs | — | Nothing to merge or review |

---

## Corrections to Run 27 (PR #137)

Run 27 reported three findings; two require correction:

1. **CVE-2026-34070 severity downgraded to N/A**: The advisory references `langchain_core/prompts/loading.py` — a Python module. The npm `@langchain/core` package has no equivalent `load_prompt()` filesystem API. This was incorrectly propagated from mixed Python/JS advisory databases. **No action required.**

2. **Puppeteer supply chain warning retracted**: Run 27 stated this was "UNCONFIRMED for v24.43.1." Targeted research against Snyk's incident tracking, StepSecurity, and Corgea's confirmed-package list shows puppeteer/puppeteer-core was **not** among the 57 compromised packages. The reference in initial reports was contextual (explaining the attack vector type), not an affected-version claim. **No action required.**

3. **CVE-2025-68664 recommendation narrowed**: Run 27 recommended upgrading to ≥ 1.2.22 to cover both CVEs. Since CVE-2026-34070 is Python-only, the minimum target is now **≥ 1.2.5** (the CVE-2025-68664 fix), reducing risk surface from unnecessary version jumps.
