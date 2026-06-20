# Dependency Audit — Run 158 (2026-06-20)

> Scheduled Claude Code routine. No native Dependabot PRs exist on this repo — `dependabot[bot]` has never opened a PR here and `.github/dependabot.yml` is not configured.

---

## Summary

| Metric | Value |
|--------|-------|
| Total packages audited | **786** |
| Vulnerabilities (`pnpm audit`) | **0** |
| Native Dependabot PRs open | **0** |
| Packages upgraded this run | **3** — nanoid, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner |
| Packages deferred | **6** — 5 unchanged from Run 157 + 1 new (@types/node major) |
| Active CVE overrides (`pnpm.overrides`) | **18** — all effective on pnpm v10.x |
| **Overall decision** | **3 MERGED (safe patches), 6 DEFERRED (major-version blockers)** |

**Repository has 0 CVE exposure. Three routine patch upgrades applied this run.**

---

## Dependabot PR Scan

**Zero native Dependabot PRs found.** `dependabot[bot]` has never opened a PR on this repository. `.github/dependabot.yml` is not configured.

75 open audit-report PRs authored by `moizj00` (Runs 57–157) remain open as history records. Most recent prior audit: PR #330 (Run 157, 2026-06-19).

---

## `pnpm audit` Result (Live)

```
No known vulnerabilities found
```

**0 vulnerabilities across 786 packages. Clean.**

---

## `pnpm outdated` (Live — before upgrades)

```
┌───────────────────────────────┬──────────┬──────────┐
│ Package                       │ Current  │ Latest   │
├───────────────────────────────┼──────────┼──────────┤
│ nanoid                        │ 5.1.14   │ 5.1.15   │
├───────────────────────────────┼──────────┼──────────┤
│ @aws-sdk/client-s3            │ 3.1072.0 │ 3.1073.0 │
├───────────────────────────────┼──────────┼──────────┤
│ @aws-sdk/s3-request-presigner │ 3.1072.0 │ 3.1073.0 │
├───────────────────────────────┼──────────┼──────────┤
│ @types/express (dev)          │ 4.17.21  │ 5.0.6    │
├───────────────────────────────┼──────────┼──────────┤
│ @types/node (dev)             │ 24.13.1  │ 26.0.0   │
├───────────────────────────────┼──────────┼──────────┤
│ express                       │ 4.22.2   │ 5.2.1    │
├───────────────────────────────┼──────────┼──────────┤
│ pnpm (dev)                    │ 10.34.1  │ 11.8.0   │
├───────────────────────────────┼──────────┼──────────┤
│ puppeteer                     │ 24.43.1  │ 25.1.0   │
├───────────────────────────────┼──────────┼──────────┤
│ typescript (dev)              │ 5.9.3    │ 6.0.3    │
└───────────────────────────────┴──────────┴──────────┘
```

**Delta vs Run 157:** 4 new entries — `nanoid`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` (all patch/minor, safe), `@types/node` (major jump, deferred).

---

## Decision Table

| Package | Before → After | Decision | Risk | Reasoning |
|---------|---------------|----------|------|-----------|
| `nanoid` | 5.1.14 → **5.1.15** | **MERGED ✅** | None | Patch release; within `^5.1.14` caret range; `tsc --noEmit` passes |
| `@aws-sdk/client-s3` | 3.1072.0 → **3.1073.0** | **MERGED ✅** | None | Routine AWS SDK minor; within `^3.1072.0` caret range; no API changes |
| `@aws-sdk/s3-request-presigner` | 3.1072.0 → **3.1073.0** | **MERGED ✅** | None | Same AWS SDK family; atomic with client-s3; within range |
| `@types/node` | 24.13.1 → 26.0.0 | **DEFER ⚠️** | High | Major version jump (24 → 26); skips v25; project targets Node ≥22.12; v26 types expose APIs unavailable at runtime |
| `pnpm` | 10.34.1 → 11.8.0 | **DEFER ⚠️ SECURITY** | Critical | `pnpm.overrides` silently dropped in v11; re-exposes all 18 CVE pins |
| `typescript` | 5.9.3 → 6.0.3 | **DEFER** | High | `types: []` default change breaks `@types/node` auto-resolution; `strict: true` becomes default |
| `express` | 4.22.2 → 5.2.1 | **DEFER** | High | Wildcard `*` → `/*splat`; `req.param()` removed; all routes need audit |
| `@types/express` | 4.17.21 → 5.0.6 | **DEFER** | High | Must upgrade atomically with express v5 |
| `puppeteer` | 24.43.1 → 25.1.0 | **DEFER** | Medium | ESM-only in v25; `executablePath()` now async; PDF regression testing required |

---

## Per-Package Reasoning

### `nanoid` 5.1.14 → 5.1.15 — MERGED ✅

Patch release. No API changes. The `pnpm.overrides` entry `"tailwindcss>nanoid": "3.3.7"` is a separate override for the transitive nanoid dependency from Tailwind (fixing an older CVE in nanoid 3.x). The direct nanoid v5 upgrade is independent and safe. `pnpm check` passed with zero errors after upgrade.

### `@aws-sdk/client-s3` 3.1072.0 → 3.1073.0 — MERGED ✅

AWS SDK for JavaScript v3 publishes minor version bumps nearly daily, with strictly additive changes. 3.1073.0 is a standard weekly patch. All existing S3 operations (`PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`, presigned URLs) remain fully backward-compatible. `pnpm check` passed.

### `@aws-sdk/s3-request-presigner` 3.1072.0 → 3.1073.0 — MERGED ✅

Part of the same AWS SDK v3 monorepo release train as `@aws-sdk/client-s3`. Must be upgraded atomically (same version) to avoid peer dependency mismatches. Upgraded together. `pnpm check` passed.

### `@types/node` 24.13.1 → 26.0.0 — DEFER ⚠️

This is a **major version jump** (24 → 26), outside the `^24.13.1` caret range (needs explicit `--latest` flag). The project targets Node ≥22.12. `@types/node@26` exposes Node.js 26 APIs that are not present on the Node 22 runtime; any accidental usage of those APIs compiles but fails at runtime. Additionally, jumping from @types/node@24 to @26 skips the v25 type surface entirely, which has known breaking changes in stream, fs, and crypto type signatures.

Migration path: Pin `@types/node` to `^22.x` (matching actual runtime target), not v26. Consider `"@types/node": "^22.0.0"` — would also un-mark this as "outdated" against the wrong major series. Estimated effort: 30min.

### `pnpm` 10.34.1 → 11.8.0 — DEFER (CRITICAL SECURITY — unchanged from Run 157)

pnpm v11 **silently drops** all 18 `pnpm.overrides` entries. All CVE pins (DOMPurify XSS HIGH, form-data prototype pollution HIGH, qs prototype pollution HIGH, esbuild 2 CVEs, and 13 others) would be re-exposed immediately upon upgrade. See Run 157 (PR #330) for full migration path.

### `typescript` 5.9.3 → 6.0.3 — DEFER (unchanged from Run 157)

TypeScript 6 changes `types` array default, breaking `@types/node` and `@types/express` resolution. `strict: true` becomes the new default. Bridge: `"ignoreDeprecations": "6.0"` + explicit `"types": ["node"]`. Estimated effort: 2–4h.

### `express` 4.22.2 → 5.2.1 — DEFER (unchanged from Run 157)

Express 5 rewrites wildcard routing (`*` → `/*splat`), removes `req.param()`, and auto-propagates async errors. All `server/_core/` routes need auditing. v4 still receives security backports — no urgency. Estimated effort: 4–8h.

### `@types/express` 4.17.21 → 5.0.6 — DEFER (unchanged from Run 157)

Blocked on express migration. Must upgrade atomically to avoid type conflicts.

### `puppeteer` 24.43.1 → 25.1.0 — DEFER (unchanged from Run 157)

ESM-only in v25; `executablePath()` is now async, requiring changes in `server/draftPdfRoute.ts`. PDF regression testing required. Estimated effort: 2–4h.

---

## Active CVE Overrides — 18 entries, all effective

```json
{
  "tailwindcss>nanoid": "3.3.7",
  "fast-xml-parser": "5.7.2",
  "esbuild": "0.28.1",
  "path-to-regexp": "0.1.13",
  "picomatch": "4.0.4",
  "brace-expansion": "5.0.6",
  "langsmith": ">=0.6.0",
  "fast-xml-builder": ">=1.1.7",
  "qs": ">=6.15.2",
  "@tootallnate/once": "3.0.1",
  "basic-ftp@<=5.2.1": ">=5.2.2",
  "basic-ftp@=5.2.0": ">=5.2.1",
  "dompurify@<=3.3.3": ">=3.4.0",
  "@xmldom/xmldom": "0.9.10",
  "uuid": "14.0.0",
  "postcss@<8.5.10": ">=8.5.10",
  "form-data@<2.5.6": ">=2.5.6",
  "@opentelemetry/core@<2.8.0": ">=2.8.0"
}
```

**⚠️ Do not upgrade pnpm to v11 before migrating all 18 overrides to `pnpm-workspace.yaml`.**

---

## Recommended Upgrade Order (When Ready)

| Priority | Package | Prerequisites | Effort | Risk |
|----------|---------|---------------|--------|------|
| 1 | **@types/node → ^22.x** | Change pinned major to match actual Node 22 runtime | 30min | Low |
| 2 | **pnpm 11.8.0** | `pnpx codemod run pnpm-v10-to-v11` + manual override migration + `pnpm audit` | 2–3h | Critical |
| 3 | **TypeScript 6.0.3** | `ignoreDeprecations: "6.0"` bridge + fix strict errors | 2–4h | High |
| 4 | **express 5.2.1 + @types/express 5.0.6** | Atomic upgrade + wildcard route audit | 4–8h | High |
| 5 | **puppeteer 25.1.0** | ESM/CJS resolution + async `executablePath()` + PDF smoke test | 2–4h | Medium |

---

## Cumulative History

| Run | Date | Updates Applied | CVEs |
|-----|------|-----------------|------|
| 119 | 2026-06-18 | 13 packages | 0 |
| 120 | 2026-06-19 | 16 packages | 0 |
| 121–157 | 2026-06-19 | 0 each (steady state) | 0 |
| **158** | **2026-06-20** | **3 (nanoid 5.1.15, @aws-sdk/client-s3 3.1073.0, @aws-sdk/s3-request-presigner 3.1073.0)** | **0** |

---

## Changes in This PR

- `pnpm-lock.yaml` — lockfile updated for nanoid 5.1.15, @aws-sdk/client-s3 3.1073.0, @aws-sdk/s3-request-presigner 3.1073.0
- `docs/DEPENDENCY_AUDIT_2026-06-20_run158.md` — this file

🤖 Generated with [Claude Code](https://claude.com/claude-code)
