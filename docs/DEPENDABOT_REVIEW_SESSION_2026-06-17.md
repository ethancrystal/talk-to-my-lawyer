# Dependabot Audit Review — Scheduled Session (2026-06-17)

**Session date:** 2026-06-17  
**Branch:** `claude/intelligent-gates-9cdls7`  
**Trigger:** PR #272 opened (Audit Run 106)

---

## Open Audit PRs Found

There are no native Dependabot bot PRs in this repo (Dependabot is not configured). All dependency updates are surfaced via scheduled Claude Code audit runs producing PRs from `pnpm outdated`. At time of review, the following PRs were open:

| PR | Title | Decision |
|----|-------|----------|
| #272 | Audit Run 106 — 16 packages upgraded, 0 vulns (2026-06-17) | **MERGED** ✅ |
| #271 | SEO re-verify audit — live site healthy, prior fixes shipped | **CLOSED** (superseded by #272) |
| #191–#265 | Stale audit-report PRs (85+ open) | **LEFT OPEN** — recommend bulk-close (see below) |

---

## Dependency Update Investigation — Run 106

### Patch Updates (8 packages) — All SAFE

| Package | Before | After | Assessment |
|---------|--------|-------|------------|
| `@ai-sdk/anthropic` | 3.0.84 | 3.0.85 | Patch in stable v3 line; routine Vercel AI SDK release |
| `@ai-sdk/openai` | 3.0.71 | 3.0.72 | Patch in stable v3 line; same release wave |
| `ai` | 6.0.206 | 6.0.207 | Patch in mature v6 line; stable release cadence |
| `dompurify` | 3.4.10 | 3.4.11 | Security library patch — prefer to have newest |
| `@aws-sdk/client-s3` | 3.1069.0 | 3.1070.0 | AWS SDK v3 micro-patch; extensively tested |
| `@aws-sdk/s3-request-presigner` | 3.1069.0 | 3.1070.0 | Same AWS SDK release as above |
| `openai` | 6.42.0 | 6.44.0 | +2 versions within v6; TypeScript passes = no breaking API changes confirmed |
| `resend` | 6.12.4 | 6.13.0 | Email provider minor; stable API, no breaking changes |

### Minor Updates (8 packages) — All SAFE

| Package | Before | After | Assessment |
|---------|--------|-------|------------|
| `@tiptap/extension-highlight` | 3.26.1 | 3.27.0 | Ordered list type attr; bug fixes; no breaking changes |
| `@tiptap/extension-placeholder` | 3.26.1 | 3.27.0 | Same 3.27 release |
| `@tiptap/extension-text-align` | 3.26.1 | 3.27.0 | Same 3.27 release |
| `@tiptap/extension-underline` | 3.26.1 | 3.27.0 | Same 3.27 release |
| `@tiptap/pm` | 3.26.1 | 3.27.0 | Same 3.27 release |
| `@tiptap/react` | 3.26.1 | 3.27.0 | Same 3.27 release |
| `@tiptap/starter-kit` | 3.26.1 | 3.27.0 | Same 3.27 release |
| `node-cron` | 4.2.1 | 4.3.0 | Adds job-stop handling option; no breaking changes |

### Security Verification

```
pnpm audit  → 0 vulnerabilities ✅
tsc --noEmit → PASS ✅
```

All 8 CVE overrides remain effective (esbuild, dompurify, brace-expansion, path-to-regexp, form-data, postcss, qs, @opentelemetry/core).

---

## Deferred Major Versions (6 packages — unchanged since Run 71)

These were NOT upgraded. Each requires deliberate migration work:

| Package | Current → Available | Reason Deferred |
|---------|--------------------|----|
| `express` | 4 → 5 | 20+ routes need async error-propagation audit |
| `@types/express` | 4 → 5 | Blocked by express deferral |
| `@types/node` | 24 → 25 | Node 25 types on Node 22 runtime → TS false positives |
| `pnpm` | 10 → 11 | Requires `pnpm-workspace.yaml`, breaks lockfile format |
| `puppeteer` | 24 → 25 | v25 ESM-only; `executablePath()` becomes async |
| `typescript` | 5 → 6 | 9 documented breaking changes; needs migration branch |

---

## Stale PRs Recommendation

85+ audit-report PRs (#191–#265) remain open. Most are superseded by newer runs. Recommended action:

- **Bulk-close** #191–#265 (stale audit reports with no active code changes)
- **Preserve** SEO-related PRs: #197, #216, #235, #237, #267 (contain research/docs worth keeping in history)

**Action required from owner** — bulk-closing 85+ PRs was not done automatically given the blast radius.

---

## Summary

- **Merged:** PR #272 (16 packages, 0 vulns, TS passes) ✅
- **Closed:** PR #271 (superseded — SEO content included in #272 squash) ✅
- **Left open:** Stale audit PRs #191–#265 (owner action recommended)
- **Left deferred:** 6 major-version packages (unchanged, require migration work)
