# Dependency Audit Run #161 — 2026-06-28

## Summary

| Metric | Result |
|--------|--------|
| Native Dependabot bot PRs (open) | **0** |
| Total historical bot PRs | **49** (all closed/merged) |
| CVEs (`pnpm audit`) | **0** ✅ |
| Updates applied | **0** |
| Active `pnpm.overrides` CVE pins | **19** |
| Deferred major-version upgrades | **8** (unchanged from run #160) |
| Total dependencies (lockfile) | **788** |

---

## Native Dependabot PR Decisions

**0 open native Dependabot bot PRs — no merge/close decisions required.**

> ✅ `.github/dependabot.yml` IS configured (npm, pip, docker, github-actions).  
> The bot has not opened new PRs since PR #86 (merged 2026-06-05).  
> Run #161 is a **clean no-op baseline** — identical to run #160.

### Historical Bot PR Summary (49 total, 0 open)

| PR | Package | Decision | Status |
|----|---------|----------|--------|
| #86 | `openai` 6.35→6.39 | ✅ MERGE — safe minor | MERGED 2026-06-05 |
| #85 | `@tiptap/starter-kit` 3.23→3.26 | ✅ MERGE — safe minor | MERGED 2026-06-05 |
| #84 | `@anthropic-ai/sdk` 0.92→0.98 | ✅ MERGE — safe minor | MERGED 2026-06-05 |
| #83 | `lucide-react` 0.453→1.17 | ❌ SKIP — major, icon API breaking | CLOSED 2026-06-07 |
| #82 | `tailwind-merge` 3.5→3.6 | ✅ MERGE — safe minor | MERGED 2026-06-05 |
| #81 | `@types/node` 24→25 | ✅ MERGE — safe minor | MERGED 2026-06-05 |
| #80 | `resend` 6.12.3→6.12.4 | ✅ MERGE — safe patch | MERGED 2026-06-05 |
| #79 | `@tailwindcss/vite` 4.2→4.3 | ✅ MERGE — safe minor | MERGED 2026-06-05 |
| #78 | `mysql2` 3.22.3→3.22.4 | ✅ MERGE — safe patch | MERGED 2026-06-05 |
| #71 | `@vitejs/plugin-react` 5→6 | ✅ MERGE — verified compat | MERGED 2026-06-05 |
| … | 39 more (all closed) | — | — |

---

## CVE Status

`pnpm audit` = **0 vulnerabilities** ✅ — all 19 `pnpm.overrides` pins active and effective.

> ⚠️ **Critical:** Do NOT upgrade `pnpm` to v11 before migrating the 19 overrides to `pnpm-workspace.yaml`. pnpm v11 silently discards `pnpm.overrides` in `package.json`, re-exposing all patched vulnerabilities.

**Active CVE Pins (19):** `tailwindcss>nanoid@3.3.7`, `fast-xml-parser@5.7.2`, `esbuild@0.28.1`, `path-to-regexp@0.1.13`, `picomatch@4.0.4`, `brace-expansion@5.0.6`, `langsmith>=0.6.0`, `fast-xml-builder>=1.1.7`, `qs>=6.15.2`, `@tootallnate/once@3.0.1`, `basic-ftp>=5.2.2`, `dompurify>=3.4.11`, `@xmldom/xmldom@0.9.10`, `uuid@14.0.0`, `postcss>=8.5.10`, `form-data>=2.5.6`, `@opentelemetry/core>=2.8.0`

---

## Deferred Major Updates (8 packages — unchanged from run #160)

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

---

## Delta from Run #160

Run #161 is a **clean no-op baseline** — identical to #160.

- `pnpm outdated` returns the same 8 deferred majors, no new additions
- All 19 CVE override pins remain active and effective
- No new Dependabot bot PRs since PR #86 (2026-06-05)
- Total lockfile packages: 788 (stable)

---

## Recommended Next Steps

1. **ESM migration sprint** — Unblocks `ai@7`, `@ai-sdk/anthropic@4`, `@ai-sdk/openai@4`, and `puppeteer@25` in a single sweep.
2. **pnpm overrides migration** — Move all 19 pins from `package.json` `pnpm.overrides` → `pnpm-workspace.yaml` `overrides`. Required before pnpm@11.
3. **Express 5 integration test pass** — Validate tRPC batch query strings with Express 5's built-in query parser.
4. **TypeScript 6 migration** — Audit `server/` for implicit Node.js ambient globals; add explicit `types` to `tsconfig.json`.
