# Dependabot Audit — Run 98 (2026-06-16)

> **Authoritative audit PR for Run 98.** No native GitHub Dependabot PRs exist in this repository — all open PRs are authored by `moizj00`. All dependency management runs through these scheduled Claude audit sessions.

---

## Security Posture ✅

```
pnpm audit (pre-run)  → 0 vulnerabilities ✅
pnpm audit (post-run) → 0 vulnerabilities ✅
tsc --noEmit          → 0 errors ✅
```

---

## Run 98 Findings

### No New Package Updates Available

`pnpm outdated` shows only the 6 consistently-deferred packages (same list since Run 71). No new patch/minor updates are available beyond what Run 96 already applied.

### What This PR Includes

This PR carries the **15-package update commit from Run 96** that was never merged to `main`. Previous sessions created duplicate audit PRs (#254, #256) but the actual `package.json` + `pnpm-lock.yaml` changes remain unmerged. This PR rebases cleanly onto current `main` with those 15 updates.

---

## PR Decisions This Run

### ✅ MERGE RECOMMENDATION — PR #256 (Run 96, 15 package updates)

> **Decision: SAFE TO MERGE**

| Field | Value |
|-------|-------|
| Type | Dependency updates: `package.json` + `pnpm-lock.yaml` |
| Scope | 15 packages — all patch or minor within declared `^` ranges |
| Vulnerabilities | 0 (pre and post audit) |
| TypeScript | Clean (`tsc --noEmit` → 0 errors) |
| CI | Vercel Agent Review → `neutral` (non-blocking) |
| Mergeable | Clean rebase onto `main` — no conflicts |

**Updates included:**

| Package | Before | After | Type |
|---------|--------|-------|------|
| `@radix-ui/react-accordion` | 1.2.13 | 1.2.14 | patch |
| `@radix-ui/react-alert-dialog` | 1.1.16 | 1.1.17 | patch |
| `@radix-ui/react-avatar` | 1.1.12 | 1.2.0 | minor |
| `@radix-ui/react-dialog` | 1.1.16 | 1.1.17 | patch |
| `@radix-ui/react-dropdown-menu` | 2.1.17 | 2.1.18 | patch |
| `@radix-ui/react-label` | 2.1.9 | 2.1.10 | patch |
| `@radix-ui/react-progress` | 1.1.9 | 1.1.10 | patch |
| `@radix-ui/react-select` | 2.3.0 | 2.3.1 | patch |
| `@radix-ui/react-separator` | 1.1.9 | 1.1.10 | patch |
| `@radix-ui/react-slot` | 1.2.5 | 1.3.0 | minor |
| `@radix-ui/react-switch` | 1.3.0 | 1.3.1 | patch |
| `@radix-ui/react-tabs` | 1.1.14 | 1.1.15 | patch |
| `@radix-ui/react-tooltip` | 1.2.9 | 1.2.10 | patch |
| `@aws-sdk/client-s3` | 3.1068.0 | 3.1069.0 | patch |
| `@aws-sdk/s3-request-presigner` | 3.1068.0 | 3.1069.0 | patch |
| `ai` | 6.0.205 | 6.0.206 | patch |

> Radix UI minor bumps (`react-avatar` 1.2.0, `react-slot` 1.3.0) are within declared `^` ranges. Radix UI follows semver strictly — minors are additive only. TypeScript confirms no new type errors after update.

---

### ⏭️ LEAVE UNMERGED — PR #257 (Run 97, docs only, unstable CI)

| Field | Value |
|-------|-------|
| Type | Documentation only (`docs/DEPENDABOT_AUDIT_RUN_97_2026-06-16.md`) |
| CI | Vercel: `unstable` merge state |
| Reason | Superseded by this PR (Run 98); docs-only with no code changes |

**Decision: LEAVE UNMERGED** — superseded by Run 98. No code changes. Can be closed as stale.

---

### 🗑️ STALE — PRs #189–#255 (Runs 57–97, prior audit records)

All prior audit PRs (#189 through #255) are stale documentation records. Each represents a prior run's findings — the code changes from each were applied as direct commits to main (e.g., PR #252 for CVE fix, PR #253 for wouter upgrade). The PR bodies are historical records only.

**Decision: SAFE TO BULK-CLOSE** — no unique code changes in any of these PRs beyond what is already in `main`.

---

## Deferred Packages (6 — unchanged since Run 71)

| Package | Installed | Latest | Reason |
|---------|-----------|--------|--------|
| `@types/express` | 4.17.21 | 5.0.6 | Blocked by Express v5 deferral (types follow runtime) |
| `@types/node` | 24.13.1 | 25.9.3 | Node 25 types on Node 22 runtime → false-positive TS errors |
| `express` | 4.22.2 | 5.2.1 | 20+ routes need async error-propagation audit for Express v5 |
| `pnpm` | 10.34.1 | 11.7.0 | v11 requires `pnpm-workspace.yaml`; breaks lockfile format |
| `puppeteer` | 24.43.1 | 25.1.0 | v25 is ESM-only; `executablePath()` becomes async |
| `typescript` | 5.9.3 | 6.0.3 | 9 documented breaking changes; needs dedicated migration branch |

---

## Active CVE Overrides — All Confirmed Effective

| Override | Package | Advisory | Severity | Status |
|----------|---------|----------|----------|--------|
| `@opentelemetry/core@<2.8.0: >=2.8.0` | @opentelemetry/core | GHSA-8988-4f7v-96qf / CVE-2026-54285 | MODERATE | ✅ Run 95 — confirmed effective |
| `esbuild: 0.28.1` (pinned) | esbuild | GHSA-67mh-4wv8-2f99 | HIGH | ✅ |
| `dompurify@<=3.3.3: >=3.4.0` | dompurify | XSS | HIGH | ✅ |
| `brace-expansion: 5.0.6` | brace-expansion | ReDoS | HIGH | ✅ |
| `path-to-regexp: 0.1.13` | path-to-regexp | Backtrack ReDoS | HIGH | ✅ |
| `form-data@<2.5.6: >=2.5.6` | form-data | GHSA-hmw2-7cc7-3qxx CRLF injection | HIGH | ✅ PR #244 (Run 87) |
| `postcss@<8.5.10: >=8.5.10` | postcss | Prototype pollution | MODERATE | ✅ |
| `qs: >=6.15.2` | qs | Prototype pollution | MODERATE | ✅ |

---

## Key Packages — Installed vs Latest

| Package | Installed | Latest | Notes |
|---------|-----------|--------|-------|
| `@anthropic-ai/sdk` | 0.103.0 | 0.104.2 | Lockfile lag — wanted `^0.104.2`; pnpm resolved older. May need manual bump. |
| `@langchain/langgraph` | 1.4.2 | 1.4.2 | ✅ Current |
| `@langchain/core` | 1.1.49 | 1.1.49 | ✅ Current |
| `@langchain/anthropic` | 1.4.1 | 1.4.1 | ✅ Current |
| `@trpc/server/client/react-query` | 11.17.0 | 11.17.0 | ✅ Current |
| `@sentry/node` / `@sentry/react` | 10.58.0 | 10.58.0 | ✅ Current |
| `react` / `react-dom` | 19.2.7 | 19.2.7 | ✅ Current |
| `stripe` | 22.2.1 | 22.2.1 | ✅ Current |
| `vitest` | 4.1.9 | 4.1.9 | ✅ Current |
| `vite` | 8.0.16 | 8.0.16 | ✅ Current |
| `esbuild` | 0.28.1 | — | ✅ CVE-pinned |
| `drizzle-orm` | 0.45.2 | 0.45.2 | ✅ Current |
| `zod` | 4.4.3 | 4.4.3 | ✅ Current |
| `pg-boss` | 12.19.1 | 12.19.1 | ✅ Current |
| `openai` | 6.42.0 | 6.42.0 | ✅ Current |
| `ai` | **6.0.206** | 6.0.206 | ✅ Updated Run 96 |
| `wouter` | **3.10.0** | 3.10.0 | ✅ Updated Run 96 (PR #253) |

---

## Action Items

1. ✅ **15 packages updated** (in this PR) — all patch/minor, TypeScript clean, 0 vulns.
2. ✅ **0 vulnerabilities** — clean audit, all CVE overrides effective.
3. **Merge this PR** — carries the Run 96 package updates rebased cleanly onto main.
4. **Bulk-close stale audit PRs** — #189–#255 are all superseded historical records.
5. **`@anthropic-ai/sdk` lockfile lag** — declared `^0.104.2` but resolved to 0.103.0; investigate with `pnpm add @anthropic-ai/sdk@latest`.
6. **Enable native Dependabot** — add `.github/dependabot.yml` to automate future PRs.
7. **Future migration work** (no CVEs, not urgent):
   - Express v5 (unblocks `@types/express` + `express`)
   - TypeScript 6.0 (dedicated migration branch)
   - Puppeteer ESM (unblocks v25)
   - pnpm v11 workspace migration

---

_Generated by Claude Code — Dependabot Audit Run 98 (2026-06-16)_
