# Dependabot Audit — Run 99 (2026-06-16)

> **Authoritative audit PR for Run 99.** No native GitHub Dependabot PRs exist in this
> repository — all open PRs are authored by `moizj00`. All dependency management runs
> through these scheduled Claude audit sessions.

---

## Security Posture ✅

```
pnpm audit (pre-run)  → 0 vulnerabilities ✅
pnpm audit (post-run) → 0 vulnerabilities ✅
tsc --noEmit          → not run (docs-only run, no code changes)
```

---

## What This Run Found

**No new package updates available.** All 15 patch/minor updates from Run 96 are confirmed
in `main` (via PR #256, merged 2026-06-16T04:32Z). Only the 6 long-standing deferred packages
remain outdated — all held back for documented breaking-change reasons (unchanged since Run 71).

### PR #259 (Run 98) — MERGED ✅

The authoritative Run 98 PR was reviewed and merged this session:

- **Net change vs `main`:** addition of `docs/DEPENDABOT_AUDIT_RUN_98_2026-06-16.md` only
- **package.json / pnpm-lock.yaml:** identical to `main` (package updates already landed via PR #256)
- **CI:** Vercel "neutral" — not a failure; safe to merge
- **Decision: MERGED** via squash commit `3685330`

---

## Open PR Decisions

### ✅ PR #259 (Run 98) — MERGED this session

See above.

### 🗑️ PR #258 — STALE (leave unmerged / bulk-close)

`chore(deps): Dependabot Audit Run 98 — 2 PRs merged, 0 vulns` — intermediate docs commit
from the same session that created PR #259. Superseded by PR #259.

### 🗑️ PR #254 (Run 96 duplicate) — STALE (leave unmerged / bulk-close)

Same 15-package updates as PR #256 (already merged) but with a merge conflict from the
wouter upgrade (PR #253). Superseded by PR #256 and PR #259.

### 🗑️ PRs #189–#251 (Runs 61–94) — STALE (bulk-close recommended)

47 historical audit PRs. All code changes from each run were applied as direct commits to
`main` at the time. These PRs are documentation records only — the docs files they reference
are already in `main`. Safe to bulk-close.

### ⏭️ PRs #197, #216, #235, #237 — OUT OF SCOPE (left for human review)

SEO / JSON-LD / sitemap PRs. Not dependency updates — human architectural review required
before merging or closing.

### ⏭️ PRs #238–#243 (Runs 81–86) — STALE (superseded, safe to close)

Runs 81–86 audit records. form-data CVE fix (Run 86/87) is confirmed in `main` via
`defaaa8`. All stale.

---

## `@anthropic-ai/sdk` Multi-Instance Resolution — Not a Bug

Prior runs flagged a "lockfile lag" on `@anthropic-ai/sdk`. Verified this session via
`pnpm why @anthropic-ai/sdk`:

```
dependencies:
@anthropic-ai/sdk 0.104.2            ← direct dep, correct
@langchain/anthropic 1.4.1
└── @anthropic-ai/sdk 0.103.0        ← nested, @langchain/anthropic pins this
```

`0.104.2` is the correct resolved version for the direct dependency. `0.103.0` is a
separate instance required by `@langchain/anthropic 1.4.1`. This is normal pnpm
multi-instance resolution — no action needed.

---

## Deferred Packages (6 — stable since Run 71, unchanged)

| Package | Installed | Latest | Reason |
|---------|-----------|--------|--------|
| `@types/express` | 4.17.21 | 5.0.6 | Blocked by Express v5 deferral (types follow runtime) |
| `@types/node` | 24.13.1 | 25.9.3 | Node 25 types on Node 22 runtime → false-positive TS errors |
| `express` | 4.22.2 | 5.2.1 | 20+ routes need async error-propagation audit for v5 |
| `pnpm` | 10.34.1 | 11.7.0 | v11 requires `pnpm-workspace.yaml`; breaks lockfile format |
| `puppeteer` | 24.43.1 | 25.1.0 | v25 ESM-only; `executablePath()` becomes async |
| `typescript` | 5.9.3 | 6.0.3 | 9 documented breaking changes; needs dedicated migration branch |

---

## Active CVE Overrides — All Confirmed Effective

| Override | Advisory | Severity |
|----------|----------|----------|
| `@opentelemetry/core@<2.8.0: >=2.8.0` | CVE-2026-54285 | MODERATE ✅ |
| `esbuild: 0.28.1` | GHSA-67mh-4wv8-2f99 | HIGH ✅ |
| `dompurify@<=3.3.3: >=3.4.0` | XSS | HIGH ✅ |
| `brace-expansion: 5.0.6` | ReDoS | HIGH ✅ |
| `path-to-regexp: 0.1.13` | Backtrack ReDoS | HIGH ✅ |
| `form-data@<2.5.6: >=2.5.6` | GHSA-hmw2-7cc7-3qxx | HIGH ✅ |
| `postcss@<8.5.10: >=8.5.10` | Prototype pollution | MODERATE ✅ |
| `qs: >=6.15.2` | Prototype pollution | MODERATE ✅ |

---

## Key Packages — Installed vs Latest

| Package | Installed | Latest | Notes |
|---------|-----------|--------|-------|
| `@anthropic-ai/sdk` | 0.104.2 | 0.104.2 | ✅ Current (multi-instance with @langchain/anthropic — see above) |
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

1. ✅ **PR #259 (Run 98) merged** — docs-only net change, confirmed safe.
2. ✅ **0 vulnerabilities** — clean audit, all 8 CVE overrides effective.
3. ✅ **All 15 Run 96 package updates confirmed in `main`** — no re-application needed.
4. ✅ **`@anthropic-ai/sdk` lockfile lag resolved** — it's normal multi-instance resolution.
5. **Bulk-close stale audit PRs** — #189–#258 (47 PRs), excluding SEO PRs #197/#216/#235/#237.
6. **Enable native Dependabot** — add `.github/dependabot.yml` to automate future PRs.
7. **Future migrations** (no CVEs, not urgent):
   - Express v5 (unblocks `express` + `@types/express`)
   - TypeScript 6.0 (dedicated migration branch)
   - Puppeteer v25 ESM migration
   - pnpm v11 workspace migration

---

_Generated by Claude Code — Dependabot Audit Run 99 (2026-06-16)_
