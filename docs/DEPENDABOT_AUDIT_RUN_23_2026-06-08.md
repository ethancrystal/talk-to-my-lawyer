# Dependabot Audit — Run 23 — 2026-06-08

**Result: 0 merged · 0 skipped · 1 lockfile patch-catch-up recommended · 3 security findings documented**

---

## Summary

No native `dependabot[bot]` PRs were open at audit time. A thorough sweep of the current dependency tree was performed: release notes, CVE databases (Snyk, GitHub Advisory, SentinelOne), and supply-chain alerts were checked for all major packages. No merges or reverts were required. One vite patch catch-up is recommended (safe, non-urgent). One supply-chain event (AntV/Shai-Hulud) is documented and confirmed **not applicable** to this project.

---

## Security Findings

### ⚠️ Vite CVEs — Already Patched in Current Version

Three high-severity CVEs were published against the Vite dev server in 2026:

| CVE | Description | Fixed in |
|-----|-------------|----------|
| CVE-2026-39363 | Arbitrary file read via WebSocket (missing Origin header check) | 8.0.5 |
| CVE-2026-39364 | `.env` / arbitrary file leak via `?raw`, `?import&raw`, `?import&url&inline` query params | 8.0.5 |
| CVE-2026-39365 | Path traversal in `.map` requests for optimised deps — bypasses `server.fs.strict` | 8.0.5 |

**Current state:** `package.json` declares `vite: ^8.0.10`; `pnpm-lock.yaml` pins `vite@8.0.10`. The CVEs were fixed at 8.0.5 — the current locked version is safe.

**Recommended action:** Run `pnpm update vite` to advance the lockfile to 8.0.16 (latest as of 2026-06-01), picking up 6 additional patch releases' bug fixes. No breaking changes between 8.0.10 and 8.0.16.

**Risk if not done:** None for CVE exposure (already patched); only missed bug fixes.

---

### ✅ AntV / Shai-Hulud Supply Chain Compromise — NOT APPLICABLE

On 2026-05-19, threat group TeamPCP published 300+ malicious versions across 323 `@antv/*` packages and related packages (echarts-for-react, timeago.js, size-sensor, canvas-nest.js) via a compromised npm maintainer account. The malware harvested CI/CD credentials and cloud secrets.

**This project is not affected.** `pnpm-lock.yaml` contains no `@antv/*` packages. Puppeteer was referenced in security write-ups only as a legitimate example of `postinstall` script usage — it was not itself compromised.

Sources: [Snyk](https://snyk.io/blog/mini-shai-hulud-antv-npm-supply-chain-attack/) · [Microsoft Security Blog](https://www.microsoft.com/en-us/security/blog/2026/05/20/mini-shai-hulud-compromised-antv-npm-packages-enable-ci-cd-credential-theft/) · [StepSecurity](https://www.stepsecurity.io/blog/shai-hulud-here-we-go-again-mass-npm-supply-chain-attack-hits-the-antv-ecosystem)

---

### ℹ️ Puppeteer 24.43.1 — One Major Version Behind

Current lockfile: `puppeteer@24.43.1`. Latest: `25.0.4` (one major version ahead).

No CVEs directly affecting puppeteer in 2026 were found. No supply-chain compromise. The project uses puppeteer for PDF generation (non-sandboxed, server-side). A major version bump warrants a dedicated PR with changelog review — not merged in this run.

**Recommendation:** Low priority. Open a dedicated PR when next doing infra maintenance.

---

## Full Dependency Health Snapshot

| Package | Pinned / Range | Lockfile | Status |
|---------|---------------|----------|--------|
| `vite` | `^8.0.10` | 8.0.10 | ✅ CVEs patched; patch catch-up to 8.0.16 available |
| `typescript` | `5.9.3` | 5.9.3 | ✅ Current; `pnpm check` passes |
| `zod` | `^4.4.3` | v4 | ✅ Already on Zod v4; no migration needed |
| `framer-motion` | `^12.38.0` | 12.x | ✅ No breaking changes in v12 |
| `lucide-react` | `^1.17.0` | v1.x | ✅ Merged in run 22 (PR #129) |
| `@types/node` | `^24.13.1` | 24.13.1 | ✅ Matches Node 24 LTS runtime |
| `openai` | `^6.39.0` | 6.39.0 | ✅ Current |
| `@anthropic-ai/sdk` | `^0.98.0` | 0.98.0 | ✅ Current |
| `stripe` | `^22.1.1` | 22.x | ✅ Merged from Dependabot #36 |
| `@langchain/langgraph` | `^1.2.9` | 1.x | ✅ LangGraph 1.x stable |
| `puppeteer` | `^24.43.1` | 24.43.1 | ⚠️ One major behind (25.0.4); not urgent |
| `actions/checkout` | `@v6` | — | ✅ Current |
| `pnpm/action-setup` | `@v6` | — | ✅ Current |
| `actions/setup-node` | `@v4` | — | ℹ️ v5 may be available; low priority |

---

## PRs Investigated This Run

**None.** Zero open `dependabot[bot]` PRs at audit time. All previously proposed upgrades have been resolved:
- Dependabot PR #83 (lucide-react) — superseded by PR #129, merged in run 22
- Dependabot PR #81 (@types/node v25) — superseded by PR #128 (v24), merged in run 22
- Dependabot PR #23 (Node 26) — correctly skipped; Node 26 is non-LTS until Oct 2026
- Dependabot PRs #85, #71, #86, #84, #79, #82, #78, #80, #64, #68, #65, #63 — all closed/merged in earlier runs

---

## Stale Audit Docs PRs (Ongoing)

PRs #96–#132 (37 open audit-run documentation PRs) remain open and continue to accumulate. None block development. **Recommend batch-closing** them via a triage session — they represent historical records that can be preserved by merging one representative PR and closing the rest.

---

## Sources

- [CVE-2026-39363: Vite Arbitrary File Read (SentinelOne)](https://www.sentinelone.com/vulnerability-database/cve-2026-39363/)
- [CVE-2026-39364: Vite .env Leak via Query Params (SecurityOnline)](https://securityonline.info/vite-vulnerabilities-cve-2026-39364-arbitrary-file-read/)
- [CVE-2026-39365: Vite .map Path Traversal (CVEDetails)](https://www.cvedetails.com/cve/CVE-2026-39365/)
- [Vite Releases](https://vite.dev/releases)
- [AntV Supply Chain Compromise — Snyk](https://snyk.io/blog/mini-shai-hulud-antv-npm-supply-chain-attack/)
- [AntV Compromise — Microsoft Security Blog](https://www.microsoft.com/en-us/security/blog/2026/05/20/mini-shai-hulud-compromised-antv-npm-packages-enable-ci-cd-credential-theft/)
- [Zod v4 Migration Guide](https://zod.dev/v4/changelog)
- [framer-motion v12 Changelog](https://motion.dev/changelog)
- [TypeScript 5.9 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)
- [Node.js v22→v24 Migration Guide](https://nodejs.org/en/blog/migrations/v22-to-v24)
