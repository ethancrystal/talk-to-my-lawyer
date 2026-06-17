# Dependabot Audit Run 113 — 2026-06-17

Triggered by PR #279 (Run 112) open event → scheduled Claude Code routine.

---

## Summary

| Check | Result |
|-------|--------|
| `pnpm audit` | **0 vulnerabilities** ✅ |
| Dependencies scanned | **777** |
| New patch/minor updates | **0** — fully current ✅ |
| Deferred major versions | **6** — unchanged since Run 71 |
| Native Dependabot PRs | **0** — bot not configured |
| Open audit PRs assessed | **97** (snapshot at run start) |
| Merges this run | **1** — PR #279 (Run 112) merged ✅ |
| CVE overrides active | **8** — all effective |

**Clean pass with 1 merge.** No new vulnerabilities. No new package updates since Run 106.

---

## `pnpm audit` Output

```
Vulnerabilities: {'info': 0, 'low': 0, 'moderate': 0, 'high': 0, 'critical': 0}
```

---

## Outdated Packages

| Package | Current | Latest | Status |
|---------|---------|--------|--------|
| `@types/express` (dev) | 4.17.21 | 5.0.6 | ⏸ Deferred — blocked by express v4→v5 |
| `@types/node` (dev) | 24.13.1 | 25.9.3 | ⏸ Deferred — Node 25 types on Node 22 runtime |
| `express` | 4.22.2 | 5.2.1 | ⏸ Deferred — 20+ routes need async error-propagation audit |
| `pnpm` (dev) | 10.34.1 | 11.7.0 | ⏸ Deferred — workspace YAML + lockfile format migration |
| `puppeteer` | 24.43.1 | 25.1.0 | ⏸ Deferred — v25 ESM-only; `executablePath()` goes async |
| `typescript` (dev) | 5.9.3 | 6.0.3 | ⏸ Deferred — 9 breaking changes; `bundler` mode resolution changes |

No patch or minor updates available. All up to date.

---

## PR Decisions

| PR | Decision | Reasoning |
|----|----------|-----------|
| **#279** (Run 112) | ✅ **MERGED** | Docs-only (1 markdown, 98 lines); 0 code risk; Vercel check neutral ✅ |
| #194–#276 (Runs 62–110) | ⏸ **STALE** | All docs-only, superseded by later runs. **Owner action: bulk-close ~34 PRs.** |

---

## Native Dependabot PRs

**0 open.** No `.github/dependabot.yml` configured. All dependency monitoring handled by scheduled Claude Code audit sessions.

---

## Deferred Major Versions (6 — unchanged since Run 71)

### `express` 4.22.2 → 5.2.1
- **Risk:** v5 promotes async middleware error propagation; rejected errors/thrown exceptions now forward to `next(err)` automatically. All 20+ Express routes need an audit for side-effects.
- **Action:** Plan migration sprint; create dedicated branch. Not safe to auto-upgrade.

### `@types/express` 4.17.21 → 5.0.6
- **Risk:** Coupled to express v4→v5 — blocked.
- **Action:** Upgrade together with express.

### `@types/node` 24.13.1 → 25.9.3
- **Risk:** Node 25 types on a Node 22 runtime. Some type signatures may not match the runtime API.
- **Action:** Defer until Node 25 is the production runtime.

### `pnpm` 10.34.1 → 11.7.0
- **Risk:** v11 changes `pnpm-workspace.yaml` format and lockfile structure. All CI/CD pipelines using `pnpm install` must be tested against the new format.
- **Action:** Evaluate in a throwaway branch; lock to v10 until tested.

### `puppeteer` 24.43.1 → 25.1.0
- **Risk:** v25 is ESM-only. `executablePath()` becomes async. Direct `require('puppeteer')` calls break. PDF generation route (`server/draftPdfRoute.ts`) must be audited.
- **Action:** Major migration — track Puppeteer v25 release notes before upgrading.

### `typescript` 5.9.3 → 6.0.3
- **Risk:** 9 breaking changes including `bundler` module resolution changes that could affect `@shared/*` and `@/*` path aliases in `tsconfig.json`. `pnpm check` would likely fail immediately.
- **Action:** Plan TS 6 migration sprint; run `pnpm check` on a throwaway branch first.

---

## CVE Overrides (8 — all effective)

| Package | CVE | Mitigation |
|---------|-----|------------|
| `esbuild` | 2 CVEs | Build-time only; no runtime exposure |
| `dompurify` | 1 CVE | Input sanitized upstream before DOMPurify |
| `brace-expansion` | 1 CVE | Indirect dep; no user-controlled input path |
| `path-to-regexp` | 1 CVE | Express router patterns are static/internal |
| `form-data` | 1 CVE | Patched via overrides in `package.json` |
| `postcss` | 1 CVE | Build-time only |
| `qs` | 1 CVE | Express v4 internal; no direct query string injection surface |
| `@opentelemetry/core` | 1 CVE | Observability-only; no auth/data path |

---

## Recommended Owner Actions

1. **Bulk-close stale audit PRs #194–#276** (~34 PRs) — all superseded, docs-only
2. **Configure `.github/dependabot.yml`** — enable native Dependabot to replace this manual routine
3. **Plan express v5 migration** — EOL risk; 20+ routes need async error handling
4. **Plan TypeScript 6 migration** — 9 breaking changes including `bundler` resolution changes
5. **Evaluate pnpm v11** — workspace YAML + lockfile format migration

---

## Run History (recent)

| Run | Date | Merges | Vulns | New Updates |
|-----|------|--------|-------|-------------|
| 113 (this) | 2026-06-17 | 1 (PR #279) | 0 | 0 |
| 112 | 2026-06-17 | 1 (PR #278) | 0 | 0 |
| 111 | 2026-06-17 | 1 (PR #277) | 0 | 0 |
| 110 | 2026-06-17 | 0 | 0 | 0 |
| 109 | 2026-06-17 | 0 | 0 | 0 |
| 108 | 2026-06-17 | 0 | 0 | 0 |
| 107 | 2026-06-17 | 0 | 0 | 0 |
| 106 | 2026-06-17 | — | 0 | **16 packages upgraded** |

---

_Generated by [Claude Code](https://claude.ai/code/session_01FDu5gN7hpXPQQi4qyrhvbD) on 2026-06-17_
