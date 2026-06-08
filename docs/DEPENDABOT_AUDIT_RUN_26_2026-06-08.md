# Dependabot Audit — Run 26 — 2026-06-08

**Result: 0 merged · 0 native Dependabot PRs open · CVE verification complete for vite 8.0.16**

---

## Summary

No native `dependabot[bot]` PRs were open at audit time. This run focused on **post-merge CVE verification** for the vite 8.0.10 → 8.0.16 update applied in Run 25 (PR #135). Both CVEs motivating the patch were confirmed via live advisories: CVE-2026-39363 (CVSS 8.2 High) and CVE-2026-39364 (CVSS 8.2 High). Both were fixed in vite 8.0.5; the project is now at 8.0.16, fully patched and past the fix. No other packages required changes.

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

## CVE Verification — vite 8.0.16 (Run 25 Update)

The vite 8.0.10 → 8.0.16 update was applied in Run 25 (PR #135, commit `01b9345`). This run confirms the two CVEs that motivated the patch:

### CVE-2026-39363 — Arbitrary File Read via WebSocket `fetchModule`

| Field | Detail |
|-------|--------|
| **Severity** | High — CVSS 8.2 |
| **Advisory** | GHSA-p9ff-h696-f583 |
| **Affected** | vite 8.0.0–8.0.4, 7.0.0–7.3.1, 6.0.0–6.4.1 |
| **Fixed in** | 8.0.5, 7.3.2, 6.4.2 |
| **Description** | `server.fs` checks were not enforced on the `fetchModule` method exposed via the Vite dev server WebSocket. An attacker who can connect to the WebSocket without an Origin header can invoke `vite:invoke` events and use `file://` URLs with `?raw` parameters to read arbitrary server files as JavaScript strings. |
| **Attack vector** | Network — requires dev server exposed with `--host`; no auth required |
| **CWE** | Improper Access Control |
| **Project impact** | **None** — project was already at 8.0.10 (patched) when CVE was disclosed; now at 8.0.16 ✅ |

### CVE-2026-39364 — `server.fs.deny` Bypass via Query Parameters

| Field | Detail |
|-------|--------|
| **Severity** | High — CVSS 8.2 |
| **Advisory** | GHSA-v2wj-q39q-566r |
| **Affected** | vite 8.0.0–8.0.4, 7.1.0–7.3.1 |
| **Fixed in** | 8.0.5, 7.3.2 |
| **Description** | Files blocked by `server.fs.deny` (e.g. `.env`, `*.crt`) could be retrieved with HTTP 200 responses by appending query parameters (`?raw`, `?import&raw`, `?import&url&inline`) — effectively bypassing the deny list entirely. |
| **Attack vector** | Network — requires dev server exposed to network; sensitive files in allowed directories |
| **CWE** | CWE-180 (Validate Before Canonicalize), CWE-284 (Improper Access Control) |
| **Project impact** | **None** — project was already at 8.0.10 (patched) when CVE was disclosed; now at 8.0.16 ✅ |

### Additional Hardening in 8.0.10 → 8.0.16

Beyond the CVE fixes (already in 8.0.5), the 8.0.10 → 8.0.16 range adds:
- Reject UNC paths in `launch-editor-middleware` (Windows path traversal hardening)
- Reject Windows alternate data stream paths
- Rolldown 1.0.3 bundler improvements
- `@vitejs/devtools` peer range widened to `^0.1.18`

**Verdict: Safe. No breaking changes. Correct security direction.**

---

## Dependency Updates Applied This Run

**None.** All dependencies are at current levels following Run 25.

---

## Dependency Health Snapshot (post Run 25)

| Package | `package.json` range | Status |
|---------|---------------------|--------|
| `vite` | `^8.0.16` | ✅ Fully patched — CVE-2026-39363 & CVE-2026-39364 resolved |
| `puppeteer` | `^24.43.1` | ℹ️ One major behind v25; no CVEs; defer to dedicated PR |
| `typescript` | `5.9.3` (exact) | ✅ Pinned; `pnpm check` passes |
| `zod` | `^4.4.3` | ✅ On v4 |
| `lucide-react` | `^1.17.0` | ✅ Merged Run 22 |
| `react` / `react-dom` | `^19.2.5` | ✅ Current React 19 |
| `openai` | `^6.39.0` | ✅ Current |
| `@anthropic-ai/sdk` | `^0.98.0` | ✅ Current |
| `stripe` | `^22.1.1` | ✅ Current |
| `framer-motion` | `^12.38.0` | ✅ Current |
| `@langchain/langgraph` | `^1.2.9` | ✅ LangGraph 1.x stable |
| `@types/node` | `^24.13.1` | ✅ Matches Node 24 LTS |
| `@ai-sdk/anthropic` | `^3.0.74` | ✅ Current |
| `@ai-sdk/openai` | `^3.0.64` | ✅ Current |

---

## Puppeteer v24 → v25 Gap (Carry-Forward)

`puppeteer@24.43.1` remains one major behind v25.x. No CVEs found. The project uses Puppeteer for server-side PDF generation only; a major bump warrants a dedicated PR with a PDF smoke test.

**Recommendation:** Low priority. Open a dedicated `chore(deps): puppeteer v25` PR during the next infra maintenance window.

---

## Stale Audit Documentation PRs

PRs #96–#134 (39 open audit-run documentation PRs) remain open and stale. History is fully preserved in the committed `docs/DEPENDABOT_AUDIT_RUN_*.md` files in this repo.

**Recommended action:** Batch-close PRs #96–#134 as "stale" to clean up the open PR list. PR #135 (Run 25, vite update) should remain open for review and merge to `main`.

---

## Decision Summary

| Item | Decision | Reason |
|------|----------|--------|
| CVE-2026-39363 (vite WebSocket file read) | ✅ Already patched | Fixed in 8.0.5; project at 8.0.16 since Run 25 |
| CVE-2026-39364 (vite `server.fs.deny` bypass) | ✅ Already patched | Fixed in 8.0.5; project at 8.0.16 since Run 25 |
| Puppeteer v24 → v25 | ⏸️ Deferred | No CVEs; needs dedicated PR + PDF smoke test |
| Node 26 Docker (#23) | ⛔ Skip | Non-LTS until Oct 2026; revisit then |

---

## Sources

- [CVE-2026-39363 / GHSA-p9ff-h696-f583](https://github.com/advisories/GHSA-p9ff-h696-f583) — Vite arbitrary file read via WebSocket
- [CVE-2026-39364 / GHSA-v2wj-q39q-566r](https://github.com/advisories/GHSA-v2wj-q39q-566r) — Vite `server.fs.deny` bypass
- [Vite releases](https://vite.dev/releases)
- `pnpm-lock.yaml` (this repo, HEAD) — authoritative version source
- [NVD CVE database](https://nvd.nist.gov)
- [OSV.dev](https://osv.dev)
