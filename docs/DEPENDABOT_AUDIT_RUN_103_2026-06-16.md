# Dependabot Audit — Run 103 (2026-06-16)

> **Triggered by:** PR #267 `pull_request.opened` webhook (SEO audit PR). Reviewed all open
> dependency-audit PRs, performed live `pnpm audit` and `pnpm outdated`, applied one new
> minor-version update (`lucide-react`), and made merge/no-merge decisions.

---

## Security Posture ✅

```
pnpm audit (pre-run)  → 0 vulnerabilities ✅
pnpm audit (post-run) → 0 vulnerabilities ✅
tsc --noEmit          → PASS ✅
```

---

## What This Run Found

### New Update: `lucide-react` 1.18.0 → 1.20.0 ✅ **APPLIED**

| Field | Value |
|-------|-------|
| Package | `lucide-react` |
| Before | 1.18.0 |
| After | 1.20.0 |
| Semver range | `^1.18.0` → now `^1.20.0` |
| Type | Minor (icon additions, no breaking API changes) |
| CVEs | None |
| Breaking changes | None in 1.19.x or 1.20.x — Lucide follows strict icon-library conventions |
| TypeScript check | `tsc --noEmit` passes post-update ✅ |
| Decision | **Safe to ship** — minor update within declared semver range |

**Release notes summary (1.19.0 – 1.20.0):** New icons added, minor rendering refinements,
no API removals or renames. All existing imports resolve unchanged.

---

## Open PR Decisions This Run

| PR | Title | Decision | Reason |
|----|-------|----------|--------|
| #266 | Run 102 — PR #264 merged, 0 vulns | ✅ **MERGE** | Docs-only (1 file, 145 additions). 0 vulns confirmed. Safe. |
| #265 | Run 101 — 0 new updates, 34 stale PRs assessed | ❌ **Leave unmerged** | Duplicate intermediate docs from Run 101/102 session; stale. |
| #263 | Run 101 — 0 new updates, 0 vulns | ❌ **Leave unmerged** | Stale Run 101 intermediate docs. |
| #260 | Run 99 — 0 new updates, 0 vulns | ❌ **Leave unmerged** | Stale. |
| #258 | Run 98 — 2 PRs merged, 0 vulns | ❌ **Leave unmerged** | Stale intermediate docs. |
| #254 | Run 96 — 15 safe updates, 0 vulns | ❌ **Leave unmerged** | Stale; package updates already in `main`. |
| #251–#228 | Runs 88–94 | ❌ **Leave unmerged** | All stale historical docs. |
| #226 | Run 71 — pg-boss 12.19.1 + 2 patches | ❌ **Leave unmerged** | Stale; changes in `main`. |
| #202, #201 | Runs 57–58 | ❌ **Leave unmerged** | Stale. |
| #196, #195, #194, #193 | Runs 62–64 | ❌ **Leave unmerged** | Stale. |
| #197, #216, #235, #237, #267 | SEO / JSON-LD PRs | ⏭️ **Left for human review** | Not dependency updates — architectural review required. |
| #238–#243 | Runs 81–86 | ❌ **Leave unmerged** | Stale; form-data CVE fix confirmed in `main`. |

**Recommended action:** Bulk-close stale audit PRs #191–#265 (excluding SEO PRs #197/#216/#235/#237/#267).

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
| `lucide-react` | 1.20.0 | 1.20.0 | ✅ Updated this run |
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

- [x] `lucide-react` updated 1.18.0 → 1.20.0 — minor, safe, tsc passes ✅
- [x] 0 vulnerabilities — all 8 CVE overrides effective ✅
- [ ] Merge PR #266 (Run 102 docs) — docs-only, safe
- [ ] Bulk-close stale audit PRs #191–#265 (skip SEO PRs #197/#216/#235/#237/#267)
- [ ] Enable native Dependabot — add `.github/dependabot.yml`
- [ ] Future migrations (no CVEs, not urgent): Express v5, TypeScript 6.0, Puppeteer v25 ESM, pnpm v11

---

_Generated by Claude Code — Dependabot Audit Run 103 (2026-06-16)_
