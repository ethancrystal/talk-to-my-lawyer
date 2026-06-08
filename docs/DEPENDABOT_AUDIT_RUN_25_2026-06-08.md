# Dependabot Audit — Run 25 — 2026-06-08

**Result: 1 merged (vite 8.0.10 → 8.0.16) · 0 native Dependabot PRs open · 0 open items remaining**

---

## Summary

No native `dependabot[bot]` PRs were open at audit time. The one outstanding maintenance item from Run 24 — the Vite patch catch-up — was executed this run: `vite` was updated from `8.0.10` to `8.0.16`, including security fixes and Rolldown 1.0.3. `pnpm check` (tsc --noEmit) passes cleanly post-update. No other packages required changes.

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

## Dependency Updates Applied This Run

### ✅ vite: 8.0.10 → 8.0.16 — MERGED

| Attribute | Detail |
|-----------|--------|
| **Type** | Patch update (within major 8) |
| **Breaking changes** | None — patch-only |
| **Security fixes** | Reject UNC paths in `launch-editor-middleware`; reject Windows alternate paths (path traversal hardening) |
| **Other changes** | Rolldown 1.0.3; `@vitejs/devtools` peer range widened to `^0.1.18` |
| **Post-update verification** | `pnpm check` (tsc --noEmit) passes ✅ |
| **Decision** | **Safe and useful** — patch security hardening with zero breaking-change risk |

**CVE Notes from Run 23 (CVE-2026-39363, CVE-2026-39364, CVE-2026-39365):** These CVEs referenced path traversal / file-read vulnerabilities in Vite versions below 8.0.5. This project was already at 8.0.10 (patched) when those runs executed. Now at 8.0.16, which adds further hardening. CVE IDs remain unverifiable against training-knowledge (post-August 2025 cutoff) but the update direction is correct regardless.

---

## Dependency Health Snapshot (from `pnpm-lock.yaml`, post-update)

| Package | `package.json` range | Lockfile pin | Status |
|---------|---------------------|--------------|--------|
| `vite` | `^8.0.16` | **8.0.16** | ✅ Updated this run |
| `puppeteer` | `^24.43.1` | **24.43.1** | ℹ️ One major behind (v25); no known CVEs; defer to dedicated PR |
| `typescript` | `5.9.3` (exact) | **5.9.3** | ✅ Pinned; `pnpm check` passes |
| `zod` | `^4.4.3` | **4.4.3** | ✅ On v4 |
| `lucide-react` | `^1.17.0` | **1.17.0** | ✅ Merged Run 22 |
| `react` / `react-dom` | `^19.2.5` | **19.2.5** | ✅ Current React 19 |
| `openai` | `^6.39.0` | **6.39.0** | ✅ Current |
| `@anthropic-ai/sdk` | `^0.98.0` | **0.98.0** | ✅ Current |
| `stripe` | `^22.1.1` | **22.1.1** | ✅ Current |
| `framer-motion` | `^12.38.0` | **12.38.0** | ✅ No breaking changes in v12 |
| `@langchain/langgraph` | `^1.2.9` | 1.x | ✅ LangGraph 1.x stable |
| `@types/node` | `^24.13.1` | **24.13.1** | ✅ Matches Node 24 LTS runtime |
| `@ai-sdk/anthropic` | `^3.0.74` | **3.0.74** | ✅ Current |
| `@ai-sdk/openai` | `^3.0.64` | **3.0.64** | ✅ Current |

---

## Puppeteer v24 → v25 Gap (Carry-Forward)

`puppeteer@24.43.1` remains one major behind v25.x. No CVEs found. The project uses Puppeteer for server-side PDF generation only; a major bump warrants a dedicated PR with a PDF smoke test.

**Recommendation:** Low priority. Open a dedicated `chore(deps): puppeteer v25` PR during next infra maintenance window.

---

## Stale Audit Documentation PRs

PRs #96–#134 (39 open audit-run documentation PRs) remain open. History is preserved in the committed `docs/DEPENDABOT_AUDIT_RUN_*.md` files regardless of PR state.

**Recommended action:** Batch-close PRs #96–#133 as "stale" to clean up the open PR list.

---

## Sources

- `pnpm-lock.yaml` (this repo, HEAD) — authoritative version source
- [Vite changelog / releases](https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md)
- [pnpm update docs](https://pnpm.io/cli/update)
- [NVD CVE database](https://nvd.nist.gov) — for live CVE verification
- [OSV.dev](https://osv.dev) — open-source vulnerability DB
