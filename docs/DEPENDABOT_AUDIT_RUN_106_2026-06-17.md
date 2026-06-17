# Dependabot Audit — Run 106 (2026-06-17)

> **Triggered by:** Scheduled routine (2026-06-17). Reviewed all open dependency-audit PRs,
> ran live `pnpm audit` and `pnpm outdated`, upgraded 16 safe patch/minor packages, and
> confirmed security posture. PR #271 (SEO re-verification docs) assessed and recommended for merge.

---

## Security Posture ✅

```
pnpm audit    → 0 vulnerabilities ✅
pnpm outdated → 6 deferred majors only (all 16 new patch/minor updates merged this run) ✅
tsc --noEmit  → PASS ✅
```

---

## PR #271 Decision — ✅ RECOMMENDED MERGE

**PR #271 — SEO re-verification audit (docs-only, 2026-06-17)**

| Field | Value |
|-------|-------|
| Changed file | `docs/SEO_AUDIT_2026-06.md` (+79 lines) |
| Content | Re-verification section: HTTP 200 confirmed on all 6 public routes, code fixes confirmed shipped, open items documented (OG image + sameAs URLs) |
| CVEs | None (docs only) |
| Breaking changes | None |
| Risk | Zero — docs-only change |
| Decision | ✅ **MERGE** — Accurate, useful re-verification; no code or schema touched |

---

## New Package Updates This Run — 16 Packages Upgraded ✅

All 16 updates are patch or minor with no breaking changes. Research performed against GitHub releases for TipTap 3.27, node-cron 4.3, and openai 6.44.

### Patch updates (clearly safe)

| Package | Before | After | Notes |
|---------|--------|-------|-------|
| `@ai-sdk/anthropic` | 3.0.84 | 3.0.85 | Patch — no breaking changes |
| `@ai-sdk/openai` | 3.0.71 | 3.0.72 | Patch — no breaking changes |
| `ai` | 6.0.206 | 6.0.207 | Patch — no breaking changes |
| `dompurify` | 3.4.10 | 3.4.11 | Patch — XSS library; important to stay current |
| `@aws-sdk/client-s3` | 3.1069.0 | 3.1070.0 | Patch — no breaking changes |
| `@aws-sdk/s3-request-presigner` | 3.1069.0 | 3.1070.0 | Patch — no breaking changes |
| `openai` | 6.42.0 | 6.44.0 | Two patches (6.43: pnpm migration; 6.44: OpenAPI spec update) — no breaking changes |
| `resend` | 6.12.4 | 6.13.0 | Minor — no breaking changes |

### Minor updates (researched, confirmed safe)

| Package | Before | After | Release notes summary |
|---------|--------|-------|-----------------------|
| `@tiptap/extension-highlight` | 3.26.1 | 3.27.0 | New: ordered list `type` preservation; fixed `isAllowedUri` protocol handling; no breaking changes |
| `@tiptap/extension-placeholder` | 3.26.1 | 3.27.0 | Same release — no breaking changes |
| `@tiptap/extension-text-align` | 3.26.1 | 3.27.0 | Same release — no breaking changes |
| `@tiptap/extension-underline` | 3.26.1 | 3.27.0 | Same release — no breaking changes |
| `@tiptap/pm` | 3.26.1 | 3.27.0 | Same release — no breaking changes |
| `@tiptap/react` | 3.26.1 | 3.27.0 | Same release — no breaking changes |
| `@tiptap/starter-kit` | 3.26.1 | 3.27.0 | Same release — no breaking changes |
| `node-cron` | 4.2.1 | 4.3.0 | New: options to handle jobs stopping unexpectedly (issue #980); no breaking changes |

---

## Native Dependabot PRs

**None.** GitHub Dependabot is not configured on this repository (no `.github/dependabot.yml`).
All dependency management runs through these scheduled Claude audit sessions.

---

## All Open Audit PRs — Status

| PR | Title | Decision | Reason |
|----|-------|----------|--------|
| #271 | SEO re-verification docs (2026-06-17) | ✅ **MERGE** | Docs-only, accurate, safe |
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

## Deferred Packages (6 — majors, unchanged since Run 71)

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
| `@ai-sdk/anthropic` | 3.0.85 | 3.0.85 | ✅ Updated this run |
| `@ai-sdk/openai` | 3.0.72 | 3.0.72 | ✅ Updated this run |
| `ai` | 6.0.207 | 6.0.207 | ✅ Updated this run |
| `dompurify` | 3.4.11 | 3.4.11 | ✅ Updated this run |
| `@aws-sdk/client-s3` | 3.1070.0 | 3.1070.0 | ✅ Updated this run |
| `@aws-sdk/s3-request-presigner` | 3.1070.0 | 3.1070.0 | ✅ Updated this run |
| `@tiptap/react` | 3.27.0 | 3.27.0 | ✅ Updated this run (all 7 tiptap packages) |
| `node-cron` | 4.3.0 | 4.3.0 | ✅ Updated this run |
| `openai` | 6.44.0 | 6.44.0 | ✅ Updated this run |
| `resend` | 6.13.0 | 6.13.0 | ✅ Updated this run |
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

---

## Action Items

- [x] 16 packages upgraded (patches + minors, 0 breaking changes) ✅
- [x] 0 vulnerabilities — all 8 CVE overrides effective ✅
- [x] `tsc --noEmit` passes after upgrades ✅
- [x] PR #271 (SEO docs re-verification) assessed → recommended merge ✅
- [ ] Merge PR #271 (docs-only SEO re-verification — owner action)
- [ ] Bulk-close stale audit PRs #191–#265 (skip SEO PRs #197/#216/#235/#237/#267)
- [ ] Enable native Dependabot — add `.github/dependabot.yml`
- [ ] Future migrations (no CVEs, not urgent): Express v5, TypeScript 6.0, Puppeteer v25 ESM, pnpm v11

---

_Generated by Claude Code — Dependabot Audit Run 106 (2026-06-17)_
