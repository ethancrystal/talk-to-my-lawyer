# Dependency Audit Run 141 — 2026-06-27

Scheduled Claude Code dependency audit routine.

---

## Executive Summary

| Check | Result |
|-------|--------|
| `pnpm audit` (post-fix) | **0 vulnerabilities** ✅ |
| `pnpm audit` (pre-fix) | **8 vulnerabilities** 🔴 (6 high, 2 moderate) |
| Dependencies scanned | **786** |
| Open Dependabot PRs (native bot) | **0** — confirmed via GitHub API |
| Updates applied | **1** — `pnpm` 10.34.1 → 10.34.4 (CVE patch) |
| Major version bumps deferred | **8** (unchanged since Run 140) |
| CVE overrides active | **19** (`pnpm.overrides`) |

**Key action this run:** `pnpm` bumped from 10.34.1 → 10.34.4 to resolve 8 newly-published CVEs (6 HIGH, 2 MODERATE) — all in `pnpm` itself. Patch stays within pnpm 10.x; the risky pnpm 11 upgrade (which would drop all CVE overrides) is still deferred.

---

## Open Dependabot PRs — Decision Log

**Confirmed zero native Dependabot PRs.**

- GitHub API search (`author:app/dependabot is:open repo:moizj00/ttml-app`) returned **0 results**
- All open PRs are authored by `moizj00` — Claude Code audit-report documents (Runs 1–140)
- **Decision: Nothing to merge, defer, or close from Dependabot**

---

## Applied Update

### ✅ `pnpm` 10.34.1 → 10.34.4

**8 CVEs fixed — all in `pnpm` itself:**

| Advisory | Severity | Fixed in | Description |
|----------|----------|----------|-------------|
| GHSA-gj8w-mvpf-x27x | HIGH | ≥10.34.2 | configDependencies can select a pacquet native install engine |
| GHSA-5wx6-mg75-v57r | HIGH | ≥10.34.2 | Manifest identity spoof satisfies allowBuilds and runs attacker lifecycle |
| GHSA-w466-c33r-3gjp | HIGH | ≥10.34.2 | Project env lockfile can short-circuit package-manager resolution and execute lockfile-selected pnpm bytes |
| GHSA-72r4-9c5j-mj57 | HIGH | ≥10.34.4 | `patch-remove` could delete project-selected files outside the patches directory |
| GHSA-fr4h-3cph-29xv | HIGH | ≥10.34.4 | Hoisted install imports lockfile alias outside node_modules |
| GHSA-qrv3-253h-g69c | HIGH | ≥10.34.4 | Path traversal in configDependencies env lockfile allows symlink creation outside node_modules/.pnpm-config |
| GHSA-3qhv-2rgh-x77r | MODERATE | ≥10.34.2 | Repository config can expand victim environment secrets into registry requests before scripts run |
| GHSA-4gxm-v5v7-fqc4 | MODERATE | ≥10.34.2 | Reserved bin name deletes PNPM_HOME during global remove |

**Why safe:** This is a patch update within the pnpm 10 line (10.34.1 → 10.34.4). All 19 `pnpm.overrides` CVE pins remain active and are unaffected — the v11 upgrade (which silently drops overrides) is still deferred. No API or interface changes between 10.34.x patch releases.

**`pnpm audit` post-fix:** `No known vulnerabilities found` ✅

---

## Deferred Major Updates (8) — No Change Since Run 140

| Package | Current | Latest | Decision | Key Risk |
|---------|---------|--------|----------|----------|
| `ai` | 6.0.208 | 7.0.2 | ⛔ DEFER | `system`→`instructions`, `onFinish`→`onEnd`; all pipeline nodes affected; ESM-only |
| `@ai-sdk/anthropic` | 3.0.85 | 4.0.0 | ⛔ DEFER | ESM-only in v4; must co-upgrade with `ai@7` + `@ai-sdk/openai@4` |
| `@ai-sdk/openai` | 3.0.74 | 4.0.0 | ⛔ DEFER | ESM-only in v4; same atomic group as above |
| `express` | 4.22.2 | 5.2.1 | ⛔ DEFER | `path-to-regexp` v8 breaks routing; `req.param()` removed; 15+ REST endpoints affected |
| `@types/express` | 4.17.21 | 5.0.6 | ⛔ DEFER | Blocked on `express@5` migration |
| `@types/node` | 24.13.1 | 26.x | ⛔ DEFER | Runtime is Node 22; v26 types introduce false safety for non-existent APIs |
| `pnpm` | 10.34.4 | 11.9.0 | ⛔ DEFER 🔴 | v11 silently drops all 19 `pnpm.overrides` CVE pins — must migrate to `pnpm-workspace.yaml` first |
| `puppeteer` | 24.43.1 | 25.2.1 | ⛔ DEFER | ESM-only in v25; `executablePath()` becomes async (breaks `server/draftPdfRoute.ts`) |

---

## CVE Override Status — 19 Active (unchanged)

All 19 `pnpm.overrides` remain intact. `pnpm audit` = **0 vulnerabilities** post-fix.

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

## Delta from Run 140 (PR #487)

| Item | Run 140 | Run 141 | Delta |
|------|---------|---------|-------|
| CVEs (pre-fix) | 0 | 8 | 🔴 +8 (new pnpm advisories) |
| CVEs (post-fix) | 0 | 0 | ✅ resolved |
| Applied updates | 0 | 1 | `pnpm` 10.34.1→10.34.4 |
| Deferred packages | 8 | 8 | unchanged |
| Native Dependabot PRs | 0 | 0 | unchanged |
| pnpm.overrides pins | 19 | 19 | unchanged |
| Dependencies scanned | 786 | 786 | unchanged |

---

## Recommended Next Actions (Priority Order)

1. **🔴 pnpm 11 pre-work (HIGH PRIORITY)** — Migrate all 19 `pnpm.overrides` to `pnpm-workspace.yaml` before any pnpm 11 upgrade.
2. **🟠 AI SDK v7 group migration** — `ai` + `@ai-sdk/openai` + `@ai-sdk/anthropic` must upgrade atomically. Run `npx @ai-sdk/codemod v7`. Audit `callLlmWithFailover()` in `server/pipeline/graph/nodes/llm-failover.ts` first.
3. **🟠 Express 5 migration** — Audit all route registrars in `server/`. Run `npx codemod@latest @expressjs/v5-migration-recipe`.
4. **🟡 Puppeteer 25** — Await sync `executablePath()` calls in `server/draftPdfRoute.ts`; manual PDF QA required.
5. **🟡 Bulk-close stale audit PRs** — 100+ open PRs from Runs 1–140 are superseded documentation records; safe to bulk-close via GitHub API.

---

*Automated by Claude Code scheduled routine · 2026-06-27*
