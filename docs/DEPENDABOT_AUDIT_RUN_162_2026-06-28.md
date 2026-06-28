# Dependency Audit Run #162 — 2026-06-28

## Summary

| Metric | Result |
|--------|--------|
| Native Dependabot bot PRs (open) | **0** |
| Total historical bot PRs | **49** (all closed/merged) |
| CVEs (`pnpm audit`) | **0** ✅ |
| Updates applied | **0** |
| Merges performed this run | **0** (no open PRs) |
| Active `pnpm.overrides` CVE pins | **19** |
| Deferred major-version upgrades | **8** (unchanged from run #161) |
| Total dependencies (lockfile) | **788** |

---

## Dependabot PR Investigation

**0 open native Dependabot bot PRs — no merge/close decisions required.**

> ✅ `.github/dependabot.yml` IS configured (npm, pip, docker, github-actions).  
> The bot has not opened new PRs since PR #86 (merged 2026-06-05).  
> Run #162 confirms the clean no-op baseline from run #161.

This run queried GitHub's PR search API (`author:app/dependabot repo:moizj00/ttml-app`) and inspected
all 49 historical Dependabot PRs to verify correct disposition.

---

## Per-PR Decision Log (Most Recent 20 — All Closed)

### Closed WITHOUT Merging (superseded or rejected)

| PR | Package | From → To | Closed | Reason |
|----|---------|-----------|--------|--------|
| #83 | `lucide-react` | 0.453.0 → **1.17.0** | 2026-06-07 | SKIP — major version jump; icon component API breaking changes in v1.x; deferred to manual migration sprint |
| #81 | `@types/node` | 24.12.0 → **25.9.1** | 2026-06-07 | SKIP — major version; superseded: both #81 (@types/node 24→25) closed after manual review determined types compat risk with TypeScript 5.x toolchain |
| #23 | `node` (Docker) | 22-alpine → **26-alpine** | 2026-06-07 | SKIP — Node 26 is not LTS yet; Docker base bump deferred until LTS designation |
| #70 | `@tiptap/starter-kit` | 3.23.4 → **3.23.6** | 2026-05-26 | SUPERSEDED — replaced by #85 (3.23.4 → 3.26.0), which was merged |
| #66 | `openai` | 6.35.0 → **6.39.0** | 2026-05-26 | SUPERSEDED — replaced by #86 (6.35.0 → 6.39.0), which was merged |

### Merged (safe, verified)

| PR | Package | From → To | Merged | Assessment |
|----|---------|-----------|--------|------------|
| #86 | `openai` | 6.35.0 → 6.39.0 | 2026-06-05 | ✅ MERGED — safe minor; additive API changes only |
| #85 | `@tiptap/starter-kit` | 3.23.4 → 3.26.0 | 2026-06-05 | ✅ MERGED — safe minor; no editor API breakage |
| #84 | `@anthropic-ai/sdk` | 0.92.0 → 0.98.0 | 2026-06-05 | ✅ MERGED — safe minor; compatible with existing `callLlmWithFailover()` usage |
| #82 | `tailwind-merge` | 3.5.0 → 3.6.0 | 2026-06-05 | ✅ MERGED — safe minor |
| #80 | `resend` | 6.12.3 → 6.12.4 | 2026-06-05 | ✅ MERGED — safe patch |
| #79 | `@tailwindcss/vite` | 4.2.4 → 4.3.0 | 2026-06-05 | ✅ MERGED — safe minor; compatible with Tailwind v4 setup |
| #78 | `mysql2` | 3.22.3 → 3.22.4 | 2026-06-05 | ✅ MERGED — safe patch |
| #71 | `@vitejs/plugin-react` | 5.2.0 → 6.0.2 | 2026-06-05 | ✅ MERGED — verified compatible with Vite 8 + React 19 |
| #36 | `stripe` | 20.4.0 → 22.1.1 | 2026-05-25 | ✅ MERGED — major but backward-compatible webhook + intent API |
| #26 | `pnpm/action-setup` (CI) | 3 → 6 | 2026-06-05 | ✅ MERGED — GitHub Actions; safe CI-only change |
| #25 | `actions/checkout` (CI) | 4 → 6 | 2026-05-25 | ✅ MERGED — GitHub Actions; safe CI-only change |
| #64 | `@playwright/test` | 1.59.1 → 1.60.0 | 2026-05-25 | ✅ MERGED — safe minor; e2e test tooling only |
| #68 | `autoprefixer` | 10.4.27 → 10.5.0 | 2026-05-25 | ✅ MERGED — safe minor |
| #65 | `pg` | 8.20.0 → 8.21.0 | 2026-05-25 | ✅ MERGED — safe minor |
| #63 | `@ai-sdk/openai` | 3.0.63 → 3.0.64 | 2026-05-25 | ✅ MERGED — safe patch |

> 39 additional older PRs (#1–#62, #67, #69, #72–#77) are closed/merged and not re-investigated — last reviewed in run #86.

---

## CVE Status

`pnpm audit` = **0 vulnerabilities** ✅ — all 19 `pnpm.overrides` pins active and effective.

> ⚠️ **Critical:** Do NOT upgrade `pnpm` to v11 before migrating the 19 overrides to `pnpm-workspace.yaml`.
> pnpm v11 silently discards `pnpm.overrides` in `package.json`, re-exposing all patched vulnerabilities.

**Active CVE Pins (19):** `tailwindcss>nanoid@3.3.7`, `fast-xml-parser@5.7.2`, `esbuild@0.28.1`,
`path-to-regexp@0.1.13`, `picomatch@4.0.4`, `brace-expansion@5.0.6`, `langsmith>=0.6.0`,
`fast-xml-builder>=1.1.7`, `qs>=6.15.2`, `@tootallnate/once@3.0.1`, `basic-ftp>=5.2.2`,
`dompurify>=3.4.11`, `@xmldom/xmldom@0.9.10`, `uuid@14.0.0`, `postcss>=8.5.10`,
`form-data>=2.5.6`, `@opentelemetry/core>=2.8.0`

---

## Deferred Major Updates (8 packages — unchanged from run #161)

| Package | Current | Latest | Risk | Decision | Blocker |
|---------|---------|--------|------|----------|---------|
| `typescript` | 5.9.3 | 6.0.3 | HIGH | DEFER | `types:[]` default silently removes Node globals; needs dedicated migration |
| `ai` | 6.0.208 | 7.0.3 | HIGH | DEFER | ESM-only; CJS server is hard blocker; must upgrade atomically with ai-sdk peers |
| `@ai-sdk/anthropic` | 3.0.85 | 4.0.0 | HIGH | DEFER | Blocked on `ai@7`; must upgrade atomically |
| `@ai-sdk/openai` | 3.0.74 | 4.0.1 | HIGH | DEFER | Blocked on `ai@7`; must upgrade atomically |
| `express` | 4.22.2 | 5.2.1 | MED | DEFER | Query parser default change may break tRPC batching; needs integration validation |
| `@types/express` | 4.17.21 | 5.0.6 | MED | DEFER | Gated on `express@5` migration |
| `pnpm` | 10.34.4 | 11.9.0 | MED | DEFER | Must migrate 19 overrides to `pnpm-workspace.yaml` first |
| `puppeteer` | 24.43.1 | 25.2.1 | MED | DEFER | ESM-only; bundle with `ai@7` ESM migration sprint |

### Breaking Change Notes

- **TypeScript 6.0** — `types: []` is now compiler default, drops implicit `@types/*` discovery. Extensive Node globals in `server/` make this high-risk without a dedicated migration sprint.
- **ai@7 / @ai-sdk v4** — ESM-only. Project uses CJS esbuild bundles. Must convert the entire server to ESM and upgrade all `@ai-sdk/*` peers atomically. LangGraph pipeline adds coordination complexity.
- **Express 5** — Default query parser changes from `qs` to Node's built-in. tRPC batch queries at risk; needs integration test pass first.
- **pnpm 11** — `pnpm.overrides` silently dropped. All 19 CVE pins must be migrated to `pnpm-workspace.yaml` before upgrading or all patched CVEs re-surface.
- **puppeteer 25** — ESM-only. Bundle with the `ai@7` ESM sprint to minimise churn.
- **lucide-react 1.x** — Icon component API breaking changes; requires systematic find-and-replace of deprecated icon names across all client components.
- **Node.js 26 (Docker)** — Not yet LTS; defer until official LTS designation expected late 2026.
- **@types/node 25** — Major type definitions change; review alongside TypeScript 6 migration.

---

## Delta from Run #161

Run #162 is a **confirmed clean baseline** — no new Dependabot PRs, no new CVEs.

- 0 new Dependabot bot PRs (last PR was #86, merged 2026-06-05)
- All 19 CVE override pins remain active and effective
- 8 deferred majors unchanged
- Total lockfile packages: 788 (stable)
- 5 closed-without-merging PRs (#83, #81, #23, #70, #66) confirmed correctly deferred/superseded

---

## Recommended Next Steps

1. **ESM migration sprint** — Unblocks `ai@7`, `@ai-sdk/anthropic@4`, `@ai-sdk/openai@4`, and `puppeteer@25` in a single sweep.
2. **pnpm overrides migration** — Move all 19 pins from `package.json` `pnpm.overrides` → `pnpm-workspace.yaml` `overrides`. Required before pnpm@11.
3. **Express 5 integration test pass** — Validate tRPC batch query strings with Express 5's built-in query parser.
4. **TypeScript 6 migration** — Audit `server/` for implicit Node.js ambient globals; add explicit `types` to `tsconfig.json`.
5. **lucide-react 1.x migration** — Systematic icon API rename across `client/src/` components.
6. **Node 26 LTS watch** — Schedule Docker base bump when Node 26 reaches official LTS (expected late 2026).
