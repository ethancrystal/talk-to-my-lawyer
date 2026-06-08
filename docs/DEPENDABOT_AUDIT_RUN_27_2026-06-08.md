# Dependabot Audit — Run 27 — 2026-06-08

**Result: 0 merged · 0 native Dependabot PRs open · 2 NEW CVEs in `@langchain/core` 1.1.41 · puppeteer supply-chain warning**

---

## Summary

No native `dependabot[bot]` PRs were open at audit time. This run surfaced **two new CVEs in `@langchain/core` 1.1.41** — CVE-2025-68664 (CVSS 9.3 Critical) and CVE-2026-34070 (CVSS 7.5 High) — and flagged an unconfirmed supply-chain incident reference for `puppeteer-core`. Both LangChain CVEs require upgrading `@langchain/core` to ≥ 1.2.22. Neither patch was applied in this run; a dedicated upgrade PR is recommended (see § Decision Summary).

---

## Open Dependabot PRs Investigated This Run

**None.** Zero native `dependabot[bot]` PRs exist in the repository at this time.

All previously tracked Dependabot PRs have been resolved:

| PR | Package | Outcome |
|----|---------|---------|
| #83 | lucide-react (v0→v1) | Superseded by PR #129 (v1.17.0), merged Run 22 ✅ |
| #81 | @types/node v25 | Superseded by PR #128 (v24), merged Run 22 ✅ |
| #23 | Node 26 | Correctly skipped — non-LTS until Oct 2026 ✅ |
| #85, #86, #84, #82, #80, #79, #78, #71, #68, #65, #64, #63 | Various | Closed/merged in earlier runs ✅ |

---

## New Security Findings

### 🔴 CVE-2025-68664 — LangChain Core Serialization Injection (CVSS 9.3 Critical)

| Field | Detail |
|-------|--------|
| **Severity** | Critical — CVSS 9.3 |
| **Advisory** | GHSA-c67j-w6g6-q2cm |
| **Affected** | `@langchain/core` ≥ 1.0.0 and < 1.2.5; also < 0.3.81 |
| **Fixed in** | 1.2.5 (npm) |
| **Description** | The `dumps()` and `dumpd()` serialization functions do not escape dictionaries with `lc` keys — LangChain's internal object marker. An attacker who can inject user data into serialized output can cause `load()` / `loads()` to deserialize it as a LangChain object, enabling secret extraction (`secrets_from_env=True` by default pre-patch) and potentially RCE via class instantiation. |
| **Attack vector** | An attacker who controls content passed to `dumps()`/`dumpd()` can exfiltrate `process.env` secrets or achieve RCE if `load()` is called downstream on the serialized payload. |
| **Project version** | `1.1.41` — **VULNERABLE** |
| **Fix action** | Upgrade `@langchain/core` to ≥ 1.2.5 (minimum) or ≥ 1.2.22 (also fixes CVE-2026-34070) |
| **Actual risk in this repo** | Medium: our pipeline uses LangChain for AI orchestration, not for deserializing user-supplied agent outputs. `dumps()`/`dumpd()` are not called on attacker-controlled inputs in `server/pipeline/graph/nodes/`. Risk is lower than the CVSS score implies but a patch is still warranted. |

### 🟠 CVE-2026-34070 — LangChain Path Traversal in Prompt Loading (CVSS 7.5 High)

| Field | Detail |
|-------|--------|
| **Severity** | High — CVSS 7.5 |
| **Advisory** | Disclosed March 27, 2026 |
| **Affected** | `@langchain/core` < 1.2.22 |
| **Fixed in** | 1.2.22 |
| **Description** | `langchain_core/prompts/loading.py` reads prompt files without path validation. An attacker who can influence the prompt-loading path (via a malicious agent instruction or API call) can instruct LangChain to read arbitrary files: Docker socket configs, SSH keys, `.env` files, etc. |
| **Attack vector** | Requires control over the prompt-loading path; not triggered by passive use |
| **Project version** | `@langchain/core` 1.1.41 — **VULNERABLE** |
| **Fix action** | Upgrade `@langchain/core` to ≥ 1.2.22 (covers both this CVE and CVE-2025-68664) |
| **Actual risk in this repo** | Low-Medium: prompts in `server/pipeline/graph/nodes/` are hardcoded strings, not filesystem-loaded at runtime. The path traversal would require an attacker to redirect the prompt-loading mechanism. However, patching is still recommended. |

### ⚠️ Puppeteer-Core — Supply Chain Incident Reference (UNCONFIRMED for v24.43.1)

| Field | Detail |
|-------|--------|
| **Incident** | Node-gyp Supply Chain Compromise — June 3, 2026 (Snyk tracking) |
| **Scope** | 57 npm packages, 286+ malicious versions; uses `binding.gyp` to execute code at install time |
| **Payload** | Harvests npm, GitHub, AWS, GCP, Azure credentials; injects GitHub Actions; self-propagates |
| **puppeteer-core** | Initial reports mention `puppeteer-core` among affected packages; follow-up searches were unable to confirm which specific versions were compromised |
| **Project version** | `puppeteer` 24.43.1 / `puppeteer-core` 24.43.1 |
| **Status** | **UNCONFIRMED** — v24.43.1 may or may not be in the affected version set |
| **Recommended action** | (1) Run `pnpm audit` in CI to check current advisory data. (2) Verify against Snyk's incident page at https://security.snyk.io/node-gyp-supply-chain-compromise-june-2026 before next production deploy. (3) The planned puppeteer v24 → v25 upgrade (v25.1.0, released May 26, 2026) should take priority if v24.43.1 is confirmed affected. |

---

## Dependency Health Snapshot

| Package | `package.json` range | Lockfile | Status |
|---------|---------------------|----------|--------|
| `vite` | `^8.0.16` | 8.0.16 | ✅ Fully patched (CVE-2026-39363/39364 fixed in 8.0.5) |
| `@langchain/core` | `^1.1.41` | **1.1.41** | 🔴 CVE-2025-68664 (CVSS 9.3) + CVE-2026-34070 (CVSS 7.5) — upgrade to ≥ 1.2.22 |
| `@langchain/langgraph` | `^1.2.9` | 1.2.9 | ✅ Check compatibility with @langchain/core 1.2.22 before upgrading |
| `@langchain/langgraph-checkpoint-postgres` | `^1.0.1` | 1.0.1 | ✅ Check compatibility with @langchain/core 1.2.22 before upgrading |
| `@langchain/anthropic` | `^1.3.27` | 1.3.27 | ✅ Check compatibility with @langchain/core 1.2.22 before upgrading |
| `@langchain/openai` | `^1.4.4` | 1.4.4 | ✅ Check compatibility with @langchain/core 1.2.22 before upgrading |
| `puppeteer` | `^24.43.1` | 24.43.1 | ⚠️ Supply chain incident reference unconfirmed; v25.1.0 available |
| `typescript` | `5.9.3` (exact) | 5.9.3 | ✅ |
| `react` / `react-dom` | `^19.2.5` | 19.2.5 | ✅ |
| `openai` | `^6.39.0` | 6.39.0 | ✅ |
| `@anthropic-ai/sdk` | `^0.98.0` | 0.98.0 | ✅ |
| `stripe` | `^22.1.1` | 22.1.1 | ✅ No direct npm CVEs found |
| `zod` | `^4.4.3` | 4.4.3 | ✅ |
| `@types/node` | `^24.13.1` | 24.13.1 | ✅ Matches Node 24 LTS |
| `@ai-sdk/anthropic` | `^3.0.74` | 3.0.74 | ✅ |
| `@ai-sdk/openai` | `^3.0.64` | 3.0.64 | ✅ |
| `framer-motion` | `^12.38.0` | 12.38.0 | ✅ |

---

## Upgrade Plan — @langchain/core 1.1.41 → 1.2.22

**Target:** `@langchain/core@1.2.22` (covers both CVE-2025-68664 and CVE-2026-34070)

**Compatibility concerns:**
- All LangChain peer packages (`@langchain/anthropic`, `@langchain/openai`, `@langchain/langgraph`, `@langchain/langgraph-checkpoint-postgres`) must be updated in lockstep if their peer-dependency constraints require a matching `@langchain/core` minor.
- The LangGraph pipeline uses `callLlmWithFailover()` in `server/pipeline/graph/nodes/llm-failover.ts` — the 1.x API is stable but verify `ChatAnthropic`/`ChatOpenAI` constructor signatures haven't changed between 1.1 and 1.2.

**Required validation gate:**
```bash
pnpm install
pnpm check      # tsc --noEmit must pass
pnpm test       # ~83 vitest tests must pass — especially phase92-langgraph-pipeline.test.ts
```

**Not applied in this run** — the update requires coordinated bumps to multiple `@langchain/*` packages and a clean `pnpm revalidate` run. Recommend opening a dedicated `chore(deps): @langchain/core 1.1.41 → 1.2.22 (CVE-2025-68664, CVE-2026-34070)` PR.

---

## Carry-Forward Items

| Item | Status | Action |
|------|--------|--------|
| `@langchain/core` CVE-2025-68664 + CVE-2026-34070 | 🔴 **NEW — Actionable** | Open dedicated upgrade PR targeting ≥ 1.2.22 |
| Puppeteer supply chain (v24.43.1) | ⚠️ **Unconfirmed** | Run `pnpm audit`; verify against Snyk incident page |
| Puppeteer v24 → v25.1.0 | ⏸️ Deferred (ongoing) | Major bump; needs dedicated PR + PDF smoke test |
| PR #135 (vite 8.0.16) | 🟡 Open, not merged to main | Safe to merge — patch security update, zero breaking changes |
| Node 26 Docker (#23) | ⛔ Skip | Non-LTS until Oct 2026; revisit then |
| Stale audit PRs #96–#136 | 🗂️ 41 open | Batch-close as stale; history in committed docs files |

---

## Decision Summary

| Item | Decision | Reason |
|------|----------|--------|
| CVE-2025-68664 (`@langchain/core` < 1.2.5) | 🔴 **Must patch** — dedicated PR | CVSS 9.3; affects serialization/deserialization path in LLM pipeline |
| CVE-2026-34070 (`@langchain/core` < 1.2.22) | 🟠 **Should patch** — same dedicated PR | CVSS 7.5; path traversal in prompt loading |
| Puppeteer supply chain warning | ⚠️ **Verify before next deploy** | Run `pnpm audit` to determine if v24.43.1 is in affected set |
| PR #135 (vite 8.0.16) | ✅ **Merge when ready** | Safe patch update already validated in Run 25 |
| Puppeteer v24 → v25.1.0 | ⏸️ **Defer** | No confirmed CVEs; major bump warrants dedicated PR |
| Node 26 Docker (#23) | ⛔ **Skip** | Non-LTS until Oct 2026 |

---

## Sources

- [CVE-2025-68664 / GHSA-c67j-w6g6-q2cm — LangChain Core Serialization Injection](https://nvd.nist.gov/vuln/detail/CVE-2025-68664)
- [CVE-2026-34070 — LangChain Path Traversal in Prompt Loading](https://nvd.nist.gov/vuln/detail/CVE-2026-34070)
- [Snyk: Node-gyp Supply Chain Compromise — June 2026](https://snyk.io/blog/node-gyp-supply-chain-compromise-self-propagating-npm-worm-binding-gyp/)
- [Snyk Incident Page: puppeteer-core](https://security.snyk.io/package/npm/puppeteer-core)
- [CVE-2026-39363 / GHSA-p9ff-h696-f583 — Vite WebSocket file read](https://github.com/advisories/GHSA-p9ff-h696-f583) *(patched Run 25)*
- [CVE-2026-39364 / GHSA-v2wj-q39q-566r — Vite `server.fs.deny` bypass](https://github.com/advisories/GHSA-v2wj-q39q-566r) *(patched Run 25)*
- [Vite Releases](https://vite.dev/releases)
- [Puppeteer Releases](https://github.com/puppeteer/puppeteer/releases)
- [NVD CVE Database](https://nvd.nist.gov)
- [GitHub Advisory Database](https://github.com/advisories)
