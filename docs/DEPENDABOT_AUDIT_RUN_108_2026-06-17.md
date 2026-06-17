# Dependabot Audit — Run 108 (2026-06-17)

**Date:** 2026-06-17  
**Branch:** `claude/intelligent-gates-62d8b6`  
**Previous run:** Run 107 (PR #274 — 0 new updates, 0 vulns)  
**Trigger:** PR #274 opened webhook → scheduled audit session

---

## Executive Summary

| Check | Result |
|-------|--------|
| `pnpm audit` | **0 vulnerabilities** ✅ |
| New patch/minor updates | **0** — fully current after Run 106 ✅ |
| Deferred major versions | **6** — unchanged since Run 71 |
| Native Dependabot PRs | **0** — bot not configured on this repo |
| Open audit-report PRs | **32** — all assessed below |

**No code changes required.** Clean audit pass.

---

## Security Scan

```
pnpm audit → 0 vulnerabilities ✅
```

All 8 CVE overrides remain effective:

| Package | Reason Override Is Safe |
|---------|------------------------|
| `esbuild` | Build-time only, not in production bundle |
| `dompurify` | Patched to 3.4.11 (security library, latest) |
| `brace-expansion` | Transitive only, no direct usage |
| `path-to-regexp` | Transitive; not on user-input routes |
| `form-data` | Transitive; patched via parent package |
| `postcss` | Dev/build-time only |
| `qs` | Transitive; no direct usage |
| `@opentelemetry/core` | Dev observability path, not data path |

---

## Package Update Status

`pnpm outdated` shows **6 packages** — all are known deferred major versions:

| Package | Current | Latest | Decision |
|---------|---------|--------|----------|
| `express` | 4.22.2 | 5.2.1 | **DEFERRED** — 20+ routes need async error audit |
| `@types/express` | 4.17.21 | 5.0.6 | **DEFERRED** — blocked by express v4→v5 |
| `@types/node` | 24.13.1 | 25.9.3 | **DEFERRED** — Node 25 types on Node 22 runtime |
| `pnpm` | 10.34.1 | 11.7.0 | **DEFERRED** — requires `pnpm-workspace.yaml` migration |
| `puppeteer` | 24.43.1 | 25.1.0 | **DEFERRED** — v25 is ESM-only; async `executablePath()` |
| `typescript` | 5.9.3 | 6.0.3 | **DEFERRED** — 9 documented breaking changes |

All patch/minor packages are fully current following Run 106's 16-package upgrade.

---

## Open PR Assessment — All 32 PRs

### Native Dependabot PRs
**None.** Dependabot bot is not configured on this repository. All dependency PRs are Claude Code audit sessions.

### PR Decision Table

| PR | Title | Date | Decision | Reasoning |
|----|-------|------|----------|-----------|
| #194 | Audit Run 62 — 7 deferred | 2026-06-11 | **LEAVE OPEN (stale)** | Superseded by 45+ later runs |
| #195 | Audit Run 63 — wouter patch deep-dive | 2026-06-11 | **LEAVE OPEN (stale)** | Superseded; wouter is current |
| #196 | Audit Run 64 — pnpm 11 / TS 6 risk re-assessment | 2026-06-11 | **LEAVE OPEN (stale)** | Risk notes absorbed into deferred list |
| #201 | Audit Run 57 — comprehensive report | 2026-06-12 | **LEAVE OPEN (stale)** | Superseded by 50+ later runs |
| #202 | Audit Run 58 — @types/node 24.13.2 | 2026-06-12 | **LEAVE OPEN (stale)** | @types/node is now at 24.13.1 (managed) |
| #226 | Audit Run 71 — pg-boss 12.19.1 + 2 patches | 2026-06-14 | **LEAVE OPEN (stale)** | pg-boss and patches were applied |
| #228 | Audit Run 73 — 0 native PRs | 2026-06-14 | **LEAVE OPEN (stale)** | Pure report, fully superseded |
| #229 | Audit Run 74 — 0 native PRs | 2026-06-14 | **LEAVE OPEN (stale)** | Pure report, fully superseded |
| #230 | Audit Run 75 — 0 native PRs | 2026-06-14 | **LEAVE OPEN (stale)** | Pure report, fully superseded |
| #231 | Audit Run 76 — 0 native PRs | 2026-06-14 | **LEAVE OPEN (stale)** | Pure report, fully superseded |
| #232 | Audit Run 77 — 0 native PRs | 2026-06-14 | **LEAVE OPEN (stale)** | Pure report, fully superseded |
| #233 | Audit Run 78 — 0 native PRs | 2026-06-14 | **LEAVE OPEN (stale)** | Pure report, fully superseded |
| #234 | Audit Run 79 — 0 native PRs | 2026-06-14 | **LEAVE OPEN (stale)** | Pure report, fully superseded |
| #238 | Audit Run 81 — 7 pkgs + claude-sonnet-4 EOL fix | 2026-06-15 | **LEAVE OPEN (stale)** | EOL fix was applied; superseded |
| #239 | Audit Run 82 — 7 packages upgraded | 2026-06-15 | **LEAVE OPEN (stale)** | Upgrades already in main |
| #240 | Audit Run 83 — 0 new upgrades | 2026-06-15 | **LEAVE OPEN (stale)** | Pure report, superseded |
| #241 | Audit Run 84 — 0 new upgrades | 2026-06-15 | **LEAVE OPEN (stale)** | Pure report, superseded |
| #242 | Audit Run 85 — 29 PRs assessed | 2026-06-15 | **LEAVE OPEN (stale)** | This run (#108) supersedes |
| #243 | Audit Run 86 — form-data HIGH CVE fixed | 2026-06-15 | **LEAVE OPEN (stale)** | CVE fix confirmed in main |
| #245 | Audit Run 88 — 0 native PRs | 2026-06-15 | **LEAVE OPEN (stale)** | Pure report, superseded |
| #246 | Audit Run 89 — 0 native PRs | 2026-06-15 | **LEAVE OPEN (stale)** | Pure report, superseded |
| #247 | Audit Run 90 — 0 native PRs | 2026-06-15 | **LEAVE OPEN (stale)** | Pure report, superseded |
| #248 | Audit Run 91 — PR #244 merged (form-data) | 2026-06-15 | **LEAVE OPEN (stale)** | Merge confirmed, superseded |
| #249 | Audit Run 92 — 0 native PRs | 2026-06-15 | **LEAVE OPEN (stale)** | Pure report, superseded |
| #250 | Audit Run 93 — 0 native PRs | 2026-06-15 | **LEAVE OPEN (stale)** | Pure report, superseded |
| #251 | Audit Run 94 — 0 native PRs | 2026-06-15 | **LEAVE OPEN (stale)** | Pure report, superseded |
| #254 | Audit Run 96 — 15 safe updates | 2026-06-16 | **LEAVE OPEN (stale)** | Updates in main via Run 106 |
| #258 | Audit Run 98 — 2 PRs merged | 2026-06-16 | **LEAVE OPEN (stale)** | Merges confirmed, superseded |
| #260 | Audit Run 99 — 0 new updates | 2026-06-16 | **LEAVE OPEN (stale)** | Pure report, superseded |
| #263 | Audit Run 101 — 0 new updates | 2026-06-16 | **LEAVE OPEN (stale)** | Pure report, superseded |
| #265 | Audit Run 102 — 34 stale PRs assessed | 2026-06-16 | **LEAVE OPEN (stale)** | This run supersedes the assessment |
| #274 | Audit Run 107 — 0 new updates, 0 vulns | 2026-06-17 | **SAFE TO MERGE** | Docs-only PR; accurate audit state; no code risk |

### Merge Decision: PR #274

PR #274 is **docs-only** (adds 2 markdown files: `DEPENDABOT_AUDIT_RUN_107_2026-06-17.md` + `DEPENDABOT_REVIEW_SESSION_2026-06-17.md`). No `package.json`, no `pnpm-lock.yaml`, no source code changes. It is accurate and the current state it documents has been independently verified in this run. **Safe to merge.**

All other 31 PRs are stale audit reports superseded by this or later runs. They contain no code changes and represent historical snapshots. **Recommended owner action: bulk-close #194–#265.**

---

## Deferred Major Versions — Migration Notes

These 6 packages require dedicated migration branches, not routine audit merges:

### `express` 4 → 5 (4.22.2 → 5.2.1)
- 20+ routes in `server/` use callback-style `(req, res, next)` error patterns
- Express v5 auto-propagates async errors — every `async` handler needs audit
- Breaking: `router.param()` callback signature changed; `req.params` typing differs
- **Estimated effort:** 2–4 hours of audit + full regression testing

### `@types/express` 4 → 5 (4.17.21 → 5.0.6)
- Blocked entirely by express v4→v5 deferral
- Upgrading types ahead of runtime package causes TS mismatches

### `@types/node` 24 → 25 (24.13.1 → 25.9.3)
- Node 25 ships APIs unavailable on Node 22 LTS (current runtime)
- Upgrading types introduces false-positive TS errors on available-but-untyped APIs
- **Unblock when:** runtime is upgraded to Node 25 LTS

### `pnpm` 10 → 11 (10.34.1 → 11.7.0)
- v11 requires `pnpm-workspace.yaml` (replaces `pnpm-workspace.yaml` v1 format)
- Breaks existing lockfile (`pnpm-lock.yaml` format changed)
- All CI scripts referencing lockfile format would need update
- **Unblock with:** dedicated lockfile migration + CI verification

### `puppeteer` 24 → 25 (24.43.1 → 25.1.0)
- v25 is ESM-only — all `require('puppeteer')` calls must become `import`
- `executablePath()` is now async (affects `server/draftPdfRoute.ts`)
- **Estimated effort:** 1–2 hours including PDF worker regression testing

### `typescript` 5 → 6 (5.9.3 → 6.0.3)
- 9 documented breaking changes in TS 6 release notes
- Notable: stricter `noImplicitOverride`, changed inference in conditional types
- `pnpm check` must pass across the full codebase after upgrade
- **Estimated effort:** 1–3 hours depending on violations found

---

## Current Package Versions (post Run 106 — fully current)

| Package | Version |
|---------|---------|
| `@ai-sdk/anthropic` | ^3.0.85 |
| `@ai-sdk/openai` | ^3.0.72 |
| `ai` | ^6.0.207 |
| `dompurify` | ^3.4.11 |
| `@aws-sdk/client-s3` | ^3.1070.0 |
| `@aws-sdk/s3-request-presigner` | ^3.1070.0 |
| `openai` | ^6.44.0 |
| `resend` | ^6.13.0 |
| `node-cron` | ^4.3.0 |
| `@tiptap/*` suite | ^3.27.0 |
| `@types/node` | ^24.13.1 |
| `typescript` | 5.9.3 |

---

## Conclusion

**Run 108 is a clean pass.**

- 0 vulnerabilities
- 0 new patch/minor updates available (all current after Run 106)
- 6 deferred majors unchanged — require deliberate migration work
- PR #274 assessed as safe to merge (docs-only)
- 31 stale audit-report PRs remain open — recommend owner bulk-close #194–#265

No automated merges executed in this run (PR #274 is docs-only; stale PRs have no code changes requiring action).
