# Dependabot Audit Run 116 — 2026-06-17

Triggered by PR #282 (Run 115) open event → scheduled Claude Code routine.

---

## Summary

| Check | Result |
|-------|--------|
| `pnpm audit` | **0 vulnerabilities** ✅ |
| Dependencies scanned | **777** |
| New patch/minor updates | **1** — `resend` 6.13.0 → 6.14.0 (minor) |
| Deferred major versions | **6** — unchanged since Run 71 |
| Native Dependabot PRs | **0** — bot not configured |
| Open audit PRs assessed | **44** (includes PR #282 / Run 115) |
| Merges this run | **0** — `resend` update deferred to manual bump (no Dependabot PR) |
| CVE overrides active | **8** — all effective |

**1 new minor update found (`resend`). No vulnerabilities. All major deferred versions unchanged.**

---

## `pnpm audit` Output

```
No known vulnerabilities found
```

All 8 CVE overrides in `pnpm.overrides` remain effective (see CVE section below).

---

## Outdated Packages

| Package | Current | Latest | Type | Status |
|---------|---------|--------|------|--------|
| `resend` | 6.13.0 | 6.14.0 | Minor | ⚠️ **NEW** — Safe minor bump; recommend updating |
| `@types/express` (dev) | 4.17.21 | 5.0.6 | Major | ⏸ Deferred — blocked by express v4→v5 |
| `@types/node` (dev) | 24.13.1 | 25.9.3 | Major | ⏸ Deferred — Node 25 types on Node 22 runtime |
| `express` | 4.22.2 | 5.2.1 | Major | ⏸ Deferred — 20+ routes need async error-propagation audit |
| `pnpm` (dev) | 10.34.1 | 11.7.0 | Major | ⏸ Deferred — workspace YAML + lockfile format migration |
| `puppeteer` | 24.43.1 | 25.1.0 | Major | ⏸ Deferred — v25 ESM-only; `executablePath()` goes async |
| `typescript` (dev) | 5.9.3 | 6.0.3 | Major | ⏸ Deferred — 9 breaking changes; `bundler` mode resolution changes |

---

## New Package: `resend` 6.13.0 → 6.14.0

**Risk assessment: LOW — Safe to update.**

- `resend` is the transactional email SDK used by this project (Resend.com service).
- This is a **minor** version bump (6.13.0 → 6.14.0); semver guarantees backwards compatibility within major version 6.
- The package is used in email sending paths: `server/` email dispatch, `server/freePreviewEmailCron.ts`, `server/paywallEmailCron.ts`, `server/draftReminders.ts`, and related notification routes.
- Minor releases in the Resend SDK typically add new API features (new email fields, batching improvements, webhook support) without removing existing ones.
- No breaking changes expected. `pnpm check` (TypeScript) would surface any type incompatibilities before runtime.

**Decision: ⚠️ RECOMMEND UPDATING** — run `pnpm add resend@6.14.0` on a branch, run `pnpm check` to verify type compatibility, then merge. This is a low-risk update.

> Note: Since this project has no native Dependabot configured, no automated PR was opened for this update. The owner should update manually or enable Dependabot.

---

## PR Decisions

| PR | Decision | Reasoning |
|----|----------|-----------|
| **#282** (Run 115) | ⏸ **OPEN** — awaiting review | Docs-only; 3 files, 505 additions; 0 code risk. Safe to merge. |
| #200–#276 (Runs 57–110) | ⏸ **STALE** | All docs-only, superseded by later runs. **Owner action: bulk-close ~43 PRs.** |

### Open Audit PRs (44 assessed)

All 43 legacy open PRs are documentation-only audit records from prior sessions,
fully superseded by this run. No code changes in any of them. No merges warranted.

PR #282 (Run 115) is safe to merge — docs-only.

---

## Native Dependabot PRs

**0 open.** No `.github/dependabot.yml` configured. All dependency monitoring handled
by scheduled Claude Code audit sessions.

---

## Deferred Major Versions (6 — unchanged since Run 71)

### `express` 4.22.2 → 5.2.1
- **Risk:** v5 promotes async middleware error propagation; rejected errors/thrown exceptions
  now forward to `next(err)` automatically. All 20+ Express routes need an audit for side-effects.
- **Breaking changes:** Error-handling middleware signatures changed; `req.query` parser stricter.
- **Action:** Plan migration sprint; create dedicated branch. Not safe to auto-upgrade.

### `@types/express` 4.17.21 → 5.0.6
- **Risk:** Coupled to express v4→v5 — blocked.
- **Action:** Upgrade together with express.

### `@types/node` 24.13.1 → 25.9.3
- **Risk:** Node 25 types on a Node 22 runtime. Some type signatures may not match the runtime API.
- **Action:** Defer until Node 25 is the production runtime.

### `pnpm` 10.34.1 → 11.7.0
- **Risk:** v11 changes `pnpm-workspace.yaml` format and lockfile structure. All CI/CD
  pipelines using `pnpm install` must be tested against the new format.
- **Action:** Evaluate in a throwaway branch; lock to v10 until tested.

### `puppeteer` 24.43.1 → 25.1.0
- **Risk:** v25 is ESM-only. `executablePath()` becomes async. Direct `require('puppeteer')`
  calls break. PDF generation route (`server/draftPdfRoute.ts`) must be audited.
- **Action:** Major migration — track Puppeteer v25 release notes before upgrading.

### `typescript` 5.9.3 → 6.0.3
- **Risk:** 9 breaking changes including `bundler` module resolution changes that could affect
  `@shared/*` and `@/*` path aliases in `tsconfig.json`. `pnpm check` would likely fail immediately.
- **Action:** Plan TS 6 migration sprint; run `pnpm check` on a throwaway branch first.

---

## CVE Overrides (8 — all effective)

| Package | CVE | Override | Mitigation |
|---------|-----|----------|------------|
| `esbuild` | 2 CVEs | `"esbuild": "0.28.1"` | Build-time only; no runtime exposure |
| `dompurify` | 1 CVE | `"dompurify@<=3.3.3": ">=3.4.0"` | Input sanitized upstream; pinned to 3.4.11 |
| `brace-expansion` | 1 CVE | `"brace-expansion": "5.0.6"` | Indirect dep; no user-controlled input path |
| `path-to-regexp` | 1 CVE | `"path-to-regexp": "0.1.13"` | Express router patterns are static/internal |
| `form-data` | 1 CVE | `"form-data@<2.5.6": ">=2.5.6"` | Patched via override; no direct exposure |
| `postcss` | 1 CVE | `"postcss@<8.5.10": ">=8.5.10"` | Build-time only |
| `qs` | 1 CVE | `"qs": ">=6.15.2"` | Express v4 internal; no direct query string injection surface |
| `@opentelemetry/core` | 1 CVE | `"@opentelemetry/core@<2.8.0": ">=2.8.0"` | Observability-only; no auth/data path |

---

## Recommended Owner Actions

1. **Update `resend` to 6.14.0** — run `pnpm add resend@6.14.0`, verify `pnpm check` passes, merge
2. **Merge PR #282** (Run 115) — docs-only, safe
3. **Bulk-close stale audit PRs #200–#276** (~43 PRs) — all superseded, docs-only
4. **Configure `.github/dependabot.yml`** — enable native Dependabot to replace this manual routine
5. **Plan express v5 migration** — EOL risk; 20+ routes need async error handling audit
6. **Plan TypeScript 6 migration** — 9 breaking changes including `bundler` resolution changes
7. **Evaluate pnpm v11** — workspace YAML + lockfile format migration required

---

## Run History (recent)

| Run | Date | Merges | Vulns | New Updates |
|-----|------|--------|-------|-------------|
| 116 (this) | 2026-06-17 | 0 | 0 | **1 (`resend` 6.14.0)** |
| 115 | 2026-06-17 | 1 (PR #281) | 0 | 0 |
| 114 | 2026-06-17 | 1 (PR #280) | 0 | 0 |
| 113 | 2026-06-17 | 1 (PR #279) | 0 | 0 |
| 112 | 2026-06-17 | 1 (PR #278) | 0 | 0 |
| 111 | 2026-06-17 | 1 (PR #277) | 0 | 0 |
| 110 | 2026-06-17 | 0 | 0 | 0 |
| 109 | 2026-06-17 | 0 | 0 | 0 |
| 108 | 2026-06-17 | 0 | 0 | 0 |
| 107 | 2026-06-17 | 0 | 0 | 0 |
| 106 | 2026-06-17 | — | 0 | **16 packages upgraded** |

---

_Generated by [Claude Code](https://claude.ai/code) on 2026-06-17_
