# Dependency Audit Run 144 — 2026-06-27

Scheduled Claude Code dependency audit routine.

---

## Executive Summary

| Check | Result |
|-------|--------|
| `pnpm audit` (pre-fix) | **0 vulnerabilities** ✅ |
| `pnpm audit` (post-fix) | **0 vulnerabilities** ✅ |
| Dependencies scanned | **96** (direct) / **786** (total) |
| Open Dependabot PRs (native bot) | **0** — confirmed via GitHub API |
| Updates applied | **0** — baseline is clean |
| Major version bumps deferred | **9** (unchanged from Run 143) |
| CVE overrides active | **19** (`pnpm.overrides`) |

**Key action this run:** No-op run. Baseline remains fully clean — 0 CVEs, no remaining safe minor/patch updates. All 9 outstanding deferred packages remain blocked on breaking-change work. No native Dependabot PRs have ever been opened on this repository.

---

## Open Dependabot PRs — Decision Log

**Confirmed zero native Dependabot PRs.**

- GitHub API (`mcp__github__list_pull_requests`) scanned **100 open PRs** — all authored by `moizj00`
- No PR has `dependabot[bot]` as author; no title matches the `Bump <pkg>` Dependabot pattern
- No head branch matches `dependabot/npm_and_yarn/*` or similar Dependabot branch naming
- All-time Dependabot bot PRs on this repo: **0** (bot has never opened a PR here)
- **Decision: Nothing to merge, defer, or close from Dependabot**

### Why no Dependabot PRs?

Dependabot is configured in `.github/dependabot.yml` but all dependency updates are being handled by this scheduled Claude Code audit routine instead. The routine performs a more thorough analysis (release notes, advisories, compatibility, breaking changes) before applying any update.

---

## Applied Updates

**None.** All safe updates have already been applied in prior runs. The current baseline is clean.

---

## Deferred Major Updates (9) — No Change Since Run 143

| Package | Current | Latest | Risk | Reason |
|---------|---------|--------|------|--------|
| `typescript` | 5.9.3 | 6.0.3 | 🔴 HIGH | Major version, pinned at exact `5.9.3` (no semver range). TypeScript 6.x breaking changes unreviewed; defer pending full release-notes audit |
| `ai` | ^6.0.208 | 7.0.3 | 🔴 HIGH | `system`→`instructions`, `onFinish`→`onEnd`; ESM-only in v7; all pipeline nodes affected; atomic group upgrade required |
| `@ai-sdk/anthropic` | ^3.0.85 | 4.0.0 | 🔴 HIGH | ESM-only in v4; must co-upgrade with `ai@7` and `@ai-sdk/openai@4` |
| `@ai-sdk/openai` | ^3.0.74 | 4.0.1 | 🔴 HIGH | ESM-only in v4; same atomic upgrade group as above |
| `express` | ^4.22.2 | 5.2.1 | 🔴 HIGH | `path-to-regexp` v8 breaking; `req.param()` removed; 15+ REST endpoints in `server/` affected |
| `@types/express` | 4.17.21 | 5.0.6 | 🔴 HIGH | Blocked on `express@5` migration |
| `pnpm` | ^10.34.4 | 11.9.0 | 🔴 HIGH | v11 silently drops all 19 `pnpm.overrides` CVE pins; must migrate to `pnpm-workspace.yaml` first |
| `puppeteer` | ^24.43.1 | 25.2.1 | 🔴 HIGH | ESM-only in v25; `executablePath()` becomes async — breaks `server/draftPdfRoute.ts` |
| `@types/node` | ^24.13.1 | 26.0.1 | 🟡 MED | Runtime is Node 22; v26 types surface non-existent APIs; low urgency |

---

## CVE Override Status — 19 Active (unchanged)

`pnpm audit` = **0 vulnerabilities** ✅

All 19 `pnpm.overrides` remain intact.

> **⚠️ Warning:** Do NOT upgrade `pnpm` to v11 before migrating these 19 overrides to `pnpm-workspace.yaml`. Doing so silently re-exposes all pinned CVEs.

| Override | Protection |
|----------|-----------|
| `esbuild@0.28.1` | Server SSRF (GHSA-g7r4-m6w7-qqqr) |
| `fast-xml-parser@5.7.2` | XXE injection |
| `fast-xml-builder>=1.1.7` | XML injection |
| `path-to-regexp@0.1.13` | ReDoS (GHSA-9wv6-86v2-598j) |
| `brace-expansion@5.0.6` | ReDoS |
| `qs>=6.15.2` | Prototype pollution |
| `langsmith>=0.6.0` | Auth bypass |
| `dompurify<=3.3.3` + `dompurify<=3.4.10` | XSS mutations |
| `form-data<2.5.6` | CVE-2026-12143 HIGH |
| `@opentelemetry/core<2.8.0` | CVE-2026-54285 |
| `postcss<8.5.10` | CSS parsing vuln |
| `@xmldom/xmldom@0.9.10` | XXE |
| `uuid@14.0.0` | UUID entropy |
| `picomatch@4.0.4` | ReDoS |
| `tailwindcss>nanoid@3.3.7` | Insecure randomness |
| `@tootallnate/once@3.0.1` | Prototype pollution |
| `basic-ftp` (two pins) | RCE via path traversal |

---

## Delta from Run 143 (PR #501)

| Item | Run 143 | Run 144 | Delta |
|------|---------|---------|-------|
| CVEs (pre-fix) | 0 | 0 | ✅ unchanged |
| CVEs (post-fix) | 0 | 0 | ✅ unchanged |
| Applied updates | 0 | 0 | — clean baseline |
| Deferred packages | 9 | 9 | unchanged |
| Native Dependabot PRs | 0 | 0 | unchanged |
| pnpm.overrides pins | 19 | 19 | unchanged |
| Dependencies scanned | 786 | 786 | unchanged |

---

## Recommended Next Actions (Priority Order)

1. **🔴 pnpm 11 pre-work (HIGH PRIORITY)** — Migrate all 19 `pnpm.overrides` to `pnpm-workspace.yaml` before any pnpm 11 upgrade.
2. **🔴 TypeScript 6 audit** — Read TypeScript 6.x migration guide; assess breaking changes against `tsconfig.json` and codebase. Run `pnpm check` with TS 6 in a branch before committing.
3. **🟠 AI SDK v7 group migration** — `ai` + `@ai-sdk/openai` + `@ai-sdk/anthropic` must upgrade atomically. Run `npx @ai-sdk/codemod v7`. Audit `callLlmWithFailover()` in `server/pipeline/graph/nodes/llm-failover.ts` first.
4. **🟠 Express 5 migration** — Audit all route registrars in `server/`. Run `npx codemod@latest @expressjs/v5-migration-recipe`.
5. **🟡 Puppeteer 25** — Make `executablePath()` calls async in `server/draftPdfRoute.ts`; manual PDF QA required.
6. **🟡 Bulk-close stale audit PRs** — 100+ open PRs from Runs 1–143 are superseded documentation records; safe to bulk-close via GitHub API.

---

*Automated by Claude Code scheduled routine · 2026-06-27*
