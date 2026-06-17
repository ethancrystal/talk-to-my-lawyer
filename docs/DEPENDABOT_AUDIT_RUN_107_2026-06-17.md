# Dependabot Audit — Run 107 (2026-06-17)

**Date:** 2026-06-17  
**Branch:** `claude/intelligent-gates-dgwikf`  
**Previous run:** Run 106 (PR #272, merged `119731c` — 16 packages upgraded)

---

## Findings

### Native Dependabot PRs
None. Dependabot bot is **not configured** on this repository. All dependency audits are performed by scheduled Claude Code sessions via `pnpm outdated`.

### Security Scan

```
pnpm audit → 0 vulnerabilities ✅
```

Zero advisories across all dependency levels (info / low / moderate / high / critical). All 8 CVE overrides from prior runs remain effective:

| Override | Package | Reason |
|----------|---------|--------|
| esbuild | dev | Build-time only, not in production bundle |
| dompurify | patched to 3.4.11 | Security library, kept at latest |
| brace-expansion | transitive | No direct usage |
| path-to-regexp | transitive | Not on user-input routes |
| form-data | transitive | Patched via parent |
| postcss | dev | Build-time only |
| qs | transitive | No direct usage |
| @opentelemetry/core | dev | Observability, not data path |

---

## Outdated Packages

`pnpm outdated` reports **6 packages** with available updates. All are **known deferred major versions**:

| Package | Current | Available | Decision |
|---------|---------|-----------|----------|
| `express` | 4.22.2 | 5.2.1 | **DEFERRED** — 20+ routes need async error-propagation audit |
| `@types/express` | 4.17.21 | 5.0.6 | **DEFERRED** — blocked by express v4→v5 |
| `@types/node` | 24.13.1 | 25.9.3 | **DEFERRED** — Node 25 types on Node 22 runtime → TS false positives |
| `pnpm` | 10.34.1 | 11.7.0 | **DEFERRED** — requires `pnpm-workspace.yaml`, breaks lockfile format |
| `puppeteer` | 24.43.1 | 25.1.0 | **DEFERRED** — v25 ESM-only; `executablePath()` becomes async |
| `typescript` | 5.9.3 | 6.0.3 | **DEFERRED** — 9 documented breaking changes; needs migration branch |

**No new patch or minor updates are available.** All patch/minor packages were brought fully current in Run 106.

---

## Decision Summary

| Category | Count | Action |
|----------|-------|--------|
| Vulnerabilities | 0 | None needed ✅ |
| New patch/minor updates | 0 | None available ✅ |
| Deferred major versions | 6 | No change — defer continues |
| Native Dependabot PRs | 0 | Bot not configured |
| Audit-tracking PRs open | 40+ | Owner action recommended (bulk-close stale) |

---

## Currently Tracked Package Versions (post Run 106)

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

## Open Audit-Tracking PRs (40+)

All 40 open PRs are **audit-tracking reports** created by `moizj00` (not by the Dependabot bot). They document previous audit sessions. Stale PRs #198–#265 are superseded by newer runs.

**Recommended owner action:** Bulk-close #198–#265 (stale audit reports). Preserve any that contain SEO research or live content (#197, #216, #235, #237, #267).

---

## Deferred Major Versions — Migration Notes

These require deliberate migration branches and are **not candidates for routine audits**:

### `express` 4→5
- 20+ routes in `server/` use callback-style error handling
- Express v5 propagates async errors automatically — requires audit of all `async` route handlers
- Estimated effort: 2–4 hours of careful audit + testing

### `@types/node` 24→25
- Node 25 types ship APIs not present in Node 22 LTS (current runtime)
- Upgrading would introduce TS false positives for unavailable APIs
- Unblock when runtime is upgraded to Node 25+

### `pnpm` 10→11
- v11 requires `pnpm-workspace.yaml` (new format); breaks existing lockfile
- Unblock on a dedicated lockfile migration branch

### `puppeteer` 24→25
- v25 is ESM-only — requires all `require('puppeteer')` → `import`
- `executablePath()` becomes async; affects PDF generation path (`server/draftPdfRoute.ts`)
- Estimated effort: 1–2 hours including PDF worker regression testing

### `typescript` 5→6
- 9 documented breaking changes in TS 6
- Requires `pnpm check` pass on the full codebase after upgrade
- Estimated effort: 1–3 hours depending on strictness violations found

---

## Conclusion

**Run 107 is a clean pass.** Zero vulnerabilities, zero new updates to apply. The codebase is fully up-to-date at the patch/minor level following Run 106's 16-package upgrade. Deferred majors remain unchanged and require deliberate migration work outside the routine audit cycle.
