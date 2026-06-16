# Dependabot Audit — Run 104 (2026-06-16)

> **Triggered by:** PR #268 `pull_request.opened` webhook (Run 103 audit PR). Reviewed all open
> dependency-audit PRs, performed live `pnpm audit` and `pnpm outdated`, merged PR #268, and
> confirmed security posture.

---

## Security Posture ✅

```
pnpm audit    → 0 vulnerabilities ✅
pnpm outdated → 6 deferred packages only (no new updates) ✅
tsc --noEmit  → PASS ✅
```

---

## PR #268 Decision — ✅ MERGED

**PR #268 — Run 103 — `lucide-react` 1.20.0, 0 vulns (2026-06-16)**

| Field | Value |
|-------|-------|
| Package updated | `lucide-react` 1.18.0 → 1.20.0 |
| Semver type | Minor (icon additions only, no breaking API changes) |
| CVEs | None |
| Breaking changes | None in 1.19.x or 1.20.x |
| TypeScript check | `tsc --noEmit` passes ✅ |
| CI check | Vercel Agent Review → `neutral` (non-blocking) ✅ |
| Changed files | 3 (package.json, pnpm-lock.yaml, docs/) |
| Decision | ✅ **MERGED** — safe minor update, 0 risk |

---

## No New Updates This Run

`pnpm outdated` returned only the 6 stable-deferred packages (unchanged since Run 71). All other
packages are at their latest versions within declared `^` semver ranges.

---

## All Open Audit PRs — Status

| PR | Title | Decision | Reason |
|----|-------|----------|--------|
| #268 | Run 103 — lucide-react 1.20.0, 0 vulns | ✅ **MERGED** | Safe minor update + docs. Verified this run. |
| #265 | Run 102 — 0 new updates, 34 stale PRs assessed | ❌ Leave unmerged | Stale intermediate docs |
| #263 | Run 101 — 0 new updates, 0 vulns | ❌ Leave unmerged | Stale intermediate docs |
| #260 | Run 99 — 0 new updates, 0 vulns | ❌ Leave unmerged | Stale |
| #258 | Run 98 — 2 PRs merged, 0 vulns | ❌ Leave unmerged | Stale; merged changes in `main` |
| #254 | Run 96 — 15 safe updates | ❌ Leave unmerged | Stale; package updates already in `main` |
| #251–#228 | Runs 73–94 | ❌ Leave unmerged | All stale historical docs |
| #226 | Run 71 — pg-boss 12.19.1 | ❌ Leave unmerged | Stale; changes in `main` |
| #202, #201 | Runs 57–58 | ❌ Leave unmerged | Stale |
| #196–#193 | Runs 62–64 | ❌ Leave unmerged | Stale |
| #197, #216, #235, #237, #267 | SEO / JSON-LD PRs | ⏭️ Human review | Not dependency updates |
| #238–#243 | Runs 81–86 | ❌ Leave unmerged | Stale historical docs |

**Recommended:** Bulk-close stale audit PRs #191–#265 (excluding SEO PRs #197/#216/#235/#237/#267).

---

## Native Dependabot PRs

**None.** GitHub Dependabot is not configured on this repository (no `.github/dependabot.yml`).
All dependency management runs through these scheduled Claude audit sessions.

---

## Deferred Packages (6 — stable since Run 71, unchanged)

| Package | Installed | Latest | Reason |
|---------|-----------|--------|--------|
| `express` | 4.22.2 | 5.2.1 | **Major** — 20+ routes need async error-propagation audit for v5 |
| `@types/express` | 4.17.21 | 5.0.6 | Blocked by `express` v5 deferral (types follow runtime) |
| `@types/node` | 24.13.1 | 25.9.3 | Node 25 types on Node 22 runtime → false-positive TS errors |
| `pnpm` | 10.34.1 | 11.7.0 | v11 requires `pnpm-workspace.yaml`; breaks lockfile format |
| `puppeteer` | 24.43.1 | 25.1.0 | v25 ESM-only; `executablePath()` becomes async |
| `typescript` | 5.9.3 | 6.0.3 | 9 documented breaking changes; needs dedicated migration branch |

---

## Active CVE Overrides — All Confirmed Effective ✅

| Override | Advisory | Severity |
|----------|----------|----------|
| `@opentelemetry/core >=2.8.0` | CVE-2026-54285 / GHSA-8988-4f7v-96qf | MODERATE ✅ |
| `esbuild: 0.28.1` (pinned) | GHSA-67mh-4wv8-2f99 | HIGH ✅ |
| `dompurify >=3.4.0` | XSS via mXSS | HIGH ✅ |
| `brace-expansion: 5.0.6` | ReDoS | HIGH ✅ |
| `path-to-regexp: 0.1.13` | Backtrack ReDoS | HIGH ✅ |
| `form-data >=2.5.6` | GHSA-hmw2-7cc7-3qxx (CRLF injection) | HIGH ✅ |
| `postcss >=8.5.10` | Prototype pollution | MODERATE ✅ |
| `qs >=6.15.2` | Prototype pollution | MODERATE ✅ |

---

## Key Packages — Installed vs Latest

| Package | Installed | Latest | Notes |
|---------|-----------|--------|-------|
| `lucide-react` | 1.20.0 | 1.20.0 | ✅ Updated in Run 103 (merged this run) |
| `@anthropic-ai/sdk` | 0.104.2 | 0.104.2 | ✅ Current |
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
| `ai` | 6.0.206 | 6.0.206 | ✅ Current |
| `wouter` | 3.10.0 | 3.10.0 | ✅ Current |

---

## Action Items

- [x] PR #268 (Run 103 — lucide-react 1.20.0) merged ✅
- [x] 0 vulnerabilities — all 8 CVE overrides effective ✅
- [x] No new package updates available (all within `^` ranges) ✅
- [ ] Bulk-close stale audit PRs #191–#265 (skip SEO PRs #197/#216/#235/#237/#267)
- [ ] Enable native Dependabot — add `.github/dependabot.yml`
- [ ] Future migrations (no CVEs, not urgent): Express v5, TypeScript 6.0, Puppeteer v25 ESM, pnpm v11

---

_Generated by Claude Code — Dependabot Audit Run 104 (2026-06-16)_
