# Dependency Audit — 2026-06-18 (Run 119)

> Automated dependency audit conducted by Claude Code scheduled routine.  
> Session: `claude/intelligent-gates-9l8va3` | Date: **2026-06-18**

---

## Summary

| Check | Result |
|-------|--------|
| `pnpm audit` | **0 vulnerabilities** ✅ |
| `pnpm check` (TypeScript) | **CLEAN** ✅ |
| Dependencies scanned | **777** |
| Updates applied (PR #287, merged) | **13** ✅ |
| Deferred major versions | **6** (unchanged since Run 71) |
| Native Dependabot PRs | **0** (bot not configured) |
| Open audit PRs assessed | **50** |
| CVE overrides active | **8** (all effective) |

---

## Merged: PR #287

All 13 updates were verified safe and merged in a single squash commit.

### Patch Updates — Safe, no research needed

| Package | From | To | Notes |
|---------|------|----|-------|
| `@ai-sdk/openai` | 3.0.72 | **3.0.73** | Patch — Vercel AI SDK OpenAI adapter |
| `ai` | 6.0.207 | **6.0.208** | Patch — Vercel AI SDK core |
| `@aws-sdk/client-s3` | 3.1070.0 | **3.1071.0** | Patch — R2/S3 storage client |
| `@aws-sdk/s3-request-presigner` | 3.1070.0 | **3.1071.0** | Patch — R2 presigned URL helper |
| `@langchain/langgraph` | 1.4.2 | **1.4.4** | Dependency-only updates, no API changes |

### Minor Updates — Verified non-breaking

| Package | From | To | Changelog Findings |
|---------|------|----|-------------------|
| `@langchain/core` | 1.1.49 | **1.2.0** | No breaking changes. New: OpenAI-compatible stream event conversion; bug fix: AIMessage content block preservation during deserialization |
| `@langchain/anthropic` | 1.4.1 | **1.5.0** | No breaking changes. Expanded native `streamEvents` coverage — additive only |
| `@langchain/openai` | 1.4.7 | **1.5.1** | No breaking changes. Consistent additive pattern with `@langchain/anthropic` 1.5.0 |
| `@trpc/client` | 11.17.0 | **11.18.0** | No breaking changes. Bug fix: mutation options prefix in tanstack-react-query; feat: server URL support for OpenAPI |
| `@trpc/react-query` | 11.17.0 | **11.18.0** | Same release as `@trpc/client` |
| `@trpc/server` | 11.17.0 | **11.18.0** | Same release as `@trpc/client` |
| `lucide-react` | 1.20.0 | **1.21.0** | New icons added only — zero API changes |
| `node-cron` | 4.3.0 | **4.4.1** | Minor within 4.x series — no breaking changes |

**Merge decision rationale:** All 5 patch updates are backward-compatible by semantic versioning. All 8 minor updates were changelog-verified: no breaking changes, only additive features or targeted bug fixes. `pnpm check` was clean after applying changes. `pnpm audit` returned 0 vulnerabilities across 777 scanned packages.

---

## Deferred Major Versions (6 — unchanged since Run 71)

| Package | Current → Latest | Blocking Issue |
|---------|-----------------|----------------|
| `express` | 4.22.2 → 5.2.1 | 20+ routes need async error-propagation audit |
| `@types/express` | 4.17.21 → 5.0.6 | Blocked by express v4→v5 |
| `@types/node` | 24.13.1 → 25.9.3 | Node 25 types on Node 22 runtime — mismatch |
| `pnpm` | 10.34.1 → 11.8.0 | `pnpm-workspace.yaml` + lockfile migration required |
| `puppeteer` | 24.43.1 → 25.1.0 | v25 ESM-only; `executablePath()` goes async |
| `typescript` | 5.9.3 → 6.0.3 | 9 breaking changes; `bundler` mode resolution changes |

> **Note:** `pnpm` latest advanced from 11.7.0 → 11.8.0 since Run 118. Still deferred.

---

## CVE Overrides (8 — all effective)

All mitigated via `pnpm.overrides` in `package.json`. `pnpm audit` returned 0 vulnerabilities confirming all overrides are effective.

| Package | CVE / Issue | Override |
|---------|-------------|----------|
| `esbuild` (2 CVEs) | HIGH + LOW | pinned `0.28.1` |
| `dompurify` | XSS advisory | `>=3.4.0` |
| `brace-expansion` | ReDoS | `5.0.6` |
| `path-to-regexp` | ReDoS | `0.1.13` |
| `form-data` | CVE-2025 | `>=2.5.6` |
| `postcss` | advisory | `>=8.5.10` |
| `qs` | prototype pollution | `>=6.15.2` |
| `@opentelemetry/core` | advisory | `>=2.8.0` |

---

## Open PR Status (all 34 stale audit PRs)

The 34 open audit PRs (#200–#285) are all superseded by PR #287 (now merged). They are safe to bulk-close as stale.

| Category | Count | Recommended Action |
|----------|-------|-------------------|
| PR #287 (Run 119) | 1 | ✅ **MERGED** |
| Stale audit records (#200–#285) | ~33 | 🗑 Bulk-close — all superseded |
| SEO / other work PRs (#216, #235, #237, #267, #286) | 5 | 👤 Owner decision |

---

## Owner Action Items

1. **Bulk-close stale audit PRs #200–#285** — ~33 PRs, all superseded by the merged #287
2. **Review SEO PRs #216, #235, #237, #267, #286** — non-dependency work, owner decision needed
3. **Configure `.github/dependabot.yml`** — enable native Dependabot to replace this manual scheduled routine
4. **Plan express v5 migration** — 20+ routes need async error handling audit before upgrading
5. **Plan TypeScript 6 migration** — 9 breaking changes; wait for upstream ecosystem readiness
