# Dependabot Audit — Run 24 — 2026-06-08

**Result: 0 merged · 0 native Dependabot PRs open · 1 patch catch-up still recommended · CVE claims from Run 23 flagged as unverifiable**

---

## Summary

No native `dependabot[bot]` PRs were open at audit time. All previously proposed Dependabot bump PRs have been resolved (merged or superseded). A full dependency snapshot was taken from `pnpm-lock.yaml`. One maintenance recommendation from Run 23 remains valid. Three CVE references published in the Run 23 report (CVE-2026-39363/39364/39365) fall outside the auditor's training-data cutoff (August 2025) and **cannot be independently verified** — they should be treated as unconfirmed until checked against a live CVE database.

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

## Dependency Health Snapshot (from `pnpm-lock.yaml`)

Versions confirmed directly from the lockfile — no assumptions.

| Package | `package.json` range | Lockfile pin | Status |
|---------|---------------------|--------------|--------|
| `vite` | `^8.0.10` | **8.0.10** | ⚠️ Patch catch-up to latest 8.0.x recommended (see below) |
| `puppeteer` | `^24.43.1` | **24.43.1** | ℹ️ One major behind (v25); no known CVEs; defer to infra PR |
| `typescript` | `5.9.3` (exact) | **5.9.3** | ✅ Pinned; `pnpm check` passes |
| `zod` | `^4.4.3` | **4.4.3** | ✅ On v4; transitive v3.25.76 for legacy deps — expected |
| `lucide-react` | `^1.17.0` | **1.17.0** | ✅ Merged Run 22 |
| `react` / `react-dom` | `^19.2.5` | **19.2.5** | ✅ Current React 19 |
| `openai` | `^6.39.0` | **6.39.0** | ✅ Current |
| `@anthropic-ai/sdk` | `^0.98.0` | 0.98.0 | ✅ Current |
| `stripe` | `^22.1.1` | **22.1.1** | ✅ Current |
| `framer-motion` | `^12.38.0` | **12.38.0** | ✅ No breaking changes in v12 |
| `@langchain/langgraph` | `^1.2.9` | 1.x | ✅ LangGraph 1.x stable |
| `@types/node` | `^24.13.1` | 24.13.1 | ✅ Matches Node 24 LTS runtime |
| `@ai-sdk/anthropic` | `^3.0.74` | 3.0.74 | ✅ Current |
| `@ai-sdk/openai` | `^3.0.64` | 3.0.64 | ✅ Current |
| `actions/checkout` | `@v6` | — | ✅ Current |
| `pnpm/action-setup` | `@v6` | — | ✅ Current |

---

## Vite Patch Catch-Up (Carry-Forward from Run 23)

`package.json` declares `vite: "^8.0.10"` and the lockfile is pinned at exactly `8.0.10`. The `^` semver range means any 8.0.x (or 8.x.x) patch/minor is allowed. Running `pnpm update vite` will advance the lockfile to whatever 8.0.x is latest, picking up bug fixes with zero breaking-change risk within the same major.

**Risk:** None for breaking changes (patch-only within major 8). Only missed bug fixes if skipped.

**Action:** `pnpm update vite && pnpm check && pnpm build` — safe to run anytime. Recommend doing this in the next routine maintenance window.

---

## ⚠️ Note on CVE Claims in Run 23

The Run 23 audit (PR #133, `docs/DEPENDABOT_AUDIT_RUN_23_2026-06-08.md`) references three CVEs:

| CVE | Claimed description |
|-----|---------------------|
| CVE-2026-39363 | Arbitrary file read via WebSocket |
| CVE-2026-39364 | `.env` leak via `?raw`/`?import&raw` query params |
| CVE-2026-39365 | Path traversal in `.map` requests |

**These CVEs were published in 2026 and fall outside this auditor's training-data cutoff (August 2025).** They cannot be independently confirmed or denied from training knowledge. The source URLs cited in Run 23 (SentinelOne, SecurityOnline, CVEDetails) should be manually verified before treating these findings as authoritative.

If confirmed, the Run 23 conclusion that `vite@8.0.10` (> 8.0.5) is unaffected remains plausible — but the CVE IDs themselves need live verification.

**Recommended action:** Verify the three CVEs against [https://nvd.nist.gov](https://nvd.nist.gov) or [https://osv.dev](https://osv.dev) before citing them in security reports.

---

## AntV Supply Chain Compromise — Carry-Forward

As documented in Runs 23 and earlier: the project has **zero `@antv/*` dependencies**. Not applicable. No further action needed.

---

## Puppeteer v24 → v25 Gap

`puppeteer@24.43.1` is one major version behind v25.x. No CVEs directly affecting puppeteer were found in pre-cutoff CVE databases. The project uses puppeteer for server-side PDF generation. A major version bump warrants a dedicated PR with changelog review and PDF smoke test — not appropriate to rush in a routine audit run.

**Recommendation:** Low priority. Open a dedicated `chore(deps): puppeteer v25` PR when next doing infra maintenance.

---

## Stale Audit Documentation PRs

PRs #96–#133 (38 open audit-run documentation PRs) remain open and continue to accumulate. None block development. History is preserved in the committed `docs/DEPENDABOT_AUDIT_RUN_*.md` files regardless of PR state.

**Recommended action:** Batch-close PRs #96–#132 as "stale" to clean up the open PR list. Each was documented and merged (or superseded) in a subsequent run. A single triage comment per PR is sufficient.

---

## Sources

- pnpm-lock.yaml (this repo, HEAD) — authoritative version source
- [pnpm update docs](https://pnpm.io/cli/update)
- [NVD CVE database](https://nvd.nist.gov) — for live CVE verification
- [OSV.dev](https://osv.dev) — open-source vulnerability DB
- [Vite changelog](https://vite.dev/releases)
- [Puppeteer changelog](https://github.com/puppeteer/puppeteer/releases)
