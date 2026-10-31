# Dependency Audit Run #169 — 2026-06-28

## Summary

| Metric | Result |
|--------|--------|
| Native Dependabot bot PRs (open) | **0** |
| Total historical bot PRs | **49** (all closed/merged; last: #86 on 2026-06-05) |
| CVEs (`pnpm audit`) | **0** ✅ |
| Updates applied | **0** |
| Active `pnpm.overrides` CVE pins | **19** ✅ |
| Deferred major-version upgrades | **8** (unchanged from run #168) |
| Total dependencies (lockfile) | **787** |

---

## Native Dependabot PR Decisions

**0 open native Dependabot bot PRs — no merge/close decisions required.**

> ✅ `.github/dependabot.yml` IS configured (npm, pip, docker, github-actions).
> The bot has not opened new PRs since PR #86 (merged 2026-06-05).
> Run #169 is a **clean no-op** — identical to runs #161–#168.

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

`pnpm audit` = **0 vulnerabilities found** ✅

All 19 `pnpm.overrides` CVE pins verified intact:

| Override | CVE / Issue |
|----------|-------------|
| `esbuild@0.28.1` | CVE-2025-25193 path traversal |
| `dompurify@>=3.4.11` (two pins) | XSS bypass |
| `form-data@>=2.5.6` | Prototype pollution |
| `@opentelemetry/core@>=2.8.0` | Security regression |
| `postcss@>=8.5.10` | ReDoS |
| `path-to-regexp@0.1.13` | Backtracking ReDoS |
| `qs@>=6.15.2` | Prototype pollution |
| `uuid@14.0.0` | CVE pin |
| `picomatch@4.0.4` | ReDoS |
| `brace-expansion@5.0.6` | ReDoS |
| `fast-xml-parser@5.7.2` | XXE / billion laughs |
| `fast-xml-builder@>=1.1.7` | Related XML fix |
| `langsmith@>=0.6.0` | Supply chain pin |
| `@xmldom/xmldom@0.9.10` | XXE |
| `nanoid@3.3.7` (via `tailwindcss>nanoid`) | Insecure randomness |
| `@tootallnate/once@3.0.1` | Dependency pin |
| `basic-ftp` (two pins) | CVE pins |

---

## `pnpm outdated` — Available Updates

### ✅ No patch/minor updates available

All packages are current. Last safe updates applied in Run #163 (2026-06-28):
- `@tanstack/react-query` → 5.101.2
- `postcss` → 8.5.16
- `prettier` → 3.9.1
- `lucide-react` → 1.22.0

### ⏸ 8 Major Upgrades — All Deferred (Breaking Changes)

| Package | Current | Latest | Reason Deferred |
|---------|---------|--------|-----------------|
| `typescript` | 5.9.3 | **6.0.3** | Breaking: stricter type checking, removed legacy flags. Full type audit required. |
| `ai` (Vercel AI SDK) | 6.0.208 | **7.0.4** | Major API changes — `useChat`, `streamText`, `generateText` signatures changed. High blast radius across pipeline graph nodes. |
| `@ai-sdk/anthropic` | 3.0.85 | **4.0.1** | Tied to `ai` v7 — cannot upgrade independently. |
| `@ai-sdk/openai` | 3.0.74 | **4.0.2** | Tied to `ai` v7 — cannot upgrade independently. |
| `express` | 4.22.2 | **5.2.1** | Express v5: async error handling, path-matching changes. All REST routes in `server/_core/index.ts` need testing. |
| `@types/express` | 4.17.21 | **5.0.6** | Tied to Express v5 — cannot upgrade independently. |
| `pnpm` | 10.34.4 | **11.9.0** | pnpm v11: lockfile format change, possible workspace behavior changes. CI verification needed. |
| `puppeteer` | 24.43.1 | **25.2.1** | Major: Chrome version bump, possible API changes in `server/draftPdfRoute.ts`. |

---

## Decision Log

| Item | Decision | Reasoning |
|------|----------|-----------|
| 0 native Dependabot PRs | **NO ACTION** | None to evaluate |
| `pnpm audit` — 0 CVEs | **NO ACTION** | Clean ✅ |
| 8 major upgrades | **ALL DEFERRED** | Breaking changes; each requires dedicated upgrade branch with full `pnpm revalidate` |

---

## Recommended Upgrade Order (when ready)

1. `pnpm` v11 — lowest blast radius; isolated to toolchain
2. `express` v5 + `@types/express` v5 — REST route regression testing needed
3. `typescript` v6 — full type audit pass
4. `ai` v7 + `@ai-sdk/anthropic` v4 + `@ai-sdk/openai` v4 — coordinated; highest blast radius across pipeline graph nodes

---

## Context

- **Run #169** triggered by scheduled audit (2026-06-28)
- Previous run: **#168** (PR #520, branch `claude/intelligent-gates-a9nl76`)
- This run: branch `claude/dep-audit-run-169-2026-06-28`
- Repo CVE-clean for **25+ consecutive runs** since overrides were established
