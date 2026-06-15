# Dependabot Audit — Run 86 (2026-06-15)

## Summary

| Item | Result |
|------|--------|
| Native Dependabot PRs | 0 (not enabled) |
| Vulnerabilities before | 1 HIGH |
| Vulnerabilities after | **0** ✅ |
| Packages merged/updated | **7** |
| Packages deferred | 7 (unchanged policy) |
| Open audit PRs | 45 (all stale; see cleanup recommendations) |

---

## NEW: Security Fix — form-data CRLF Injection (GHSA-hmw2-7cc7-3qxx)

**Severity:** HIGH  
**Advisory:** https://github.com/advisories/GHSA-hmw2-7cc7-3qxx  
**Description:** CRLF injection vulnerability via unescaped multipart field names and filenames in `form-data < 2.5.6`.  
**Path:** `@google-cloud/storage@7.21.0 > retry-request@7.0.2 > @types/request@2.48.13 > form-data@2.5.5`  
**Fix applied:** Added `"form-data@<2.5.6": ">=2.5.6"` to `pnpm.overrides` in `package.json`.

> **Note:** This vulnerability was NOT detected in Run 85. It appeared in the current audit run (2026-06-15).

---

## Packages Updated This Run

| Package | Before | After | Type | Notes |
|---------|--------|-------|------|-------|
| `@anthropic-ai/sdk` | 0.104.1 | **0.104.2** | patch | SDK bug fixes |
| `@sentry/node` | 10.57.0 | **10.58.0** | patch | Observability patch |
| `@sentry/react` | 10.57.0 | **10.58.0** | patch | Observability patch |
| `@supabase/supabase-js` | 2.108.1 | **2.108.2** | patch | Client bug fixes |
| `@playwright/test` | 1.60.0 | **1.61.0** | minor | Test runner update |
| `vitest` | 4.1.8 | **4.1.9** | patch | Test framework patch |
| `@vitest/coverage-v8` | 4.1.8 | **4.1.9** | patch | Must stay in sync with vitest |

All updates are within existing semver ranges. No API changes. No breaking behavior.

---

## Deferred Packages (Stable Policy — Since Run 71)

| Package | Current | Latest | Blocker |
|---------|---------|--------|---------|
| `wouter` | 3.7.1 | 3.10.0 | `pnpm.patchedDependencies` targets `wouter@3.7.1` exactly — patch must be ported first |
| `@types/express` | 4.17.21 | 5.0.6 | v5 types require Express 5 runtime; blocked by `express` deferral |
| `@types/node` | 24.13.1 | 25.9.3 | Node 25 types on Node 22 runtime → false-positive TS errors; pinned `^24.x` |
| `express` | 4.22.2 | 5.2.1 | 20+ REST routes need async error-propagation audit for Express 5 |
| `pnpm` | 10.34.1 | 11.7.0 | v11 requires `pnpm-workspace.yaml`; breaks lockfile format |
| `puppeteer` | 24.43.1 | 25.1.0 | v25 is ESM-only; `executablePath()` becomes async — needs migration branch |
| `typescript` | 5.9.3 | 6.0.3 | 9 documented behavior changes; needs dedicated migration branch |

---

## Open Audit PRs — Assessment

45 open `chore(deps):` PRs exist, all stale. **None merged this run.**

| Category | PRs | Recommendation |
|----------|-----|----------------|
| Docs-only historical records | ~22 | Close (stale) |
| Code PRs where changes are already in `main` | ~7 | Close (superseded) |
| Recent reports (Run 80–85) | ~16 | Close after this PR merges |

**Most recent code PRs confirmed already in `main`:** #199, #202, #220, #221, #226, #238, #239.

### Recommendation: Enable Native Dependabot

Add `.github/dependabot.yml` to get automatic patch-level PRs from GitHub, reducing reliance on scheduled Claude audit sessions:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    ignore:
      - dependency-name: "express"
        versions: ["5.x"]
      - dependency-name: "@types/express"
        versions: ["5.x"]
      - dependency-name: "@types/node"
        versions: ["25.x"]
      - dependency-name: "pnpm"
        versions: ["11.x"]
      - dependency-name: "puppeteer"
        versions: ["25.x"]
      - dependency-name: "typescript"
        versions: ["6.x"]
```

---

## Security Posture After This Run

```
pnpm audit → 0 vulnerabilities (775 dependencies scanned)
tsc --noEmit → 0 errors
```

Previously patched CVEs remain fixed:
- esbuild HIGH + LOW (pinned `0.28.1` via override)
- dompurify XSS (override `>=3.4.0`)
- brace-expansion ReDoS (override `5.0.6`)
- path-to-regexp backtrack (override `0.1.13`)
- form-data CRLF injection (**NEW — fixed this run**)
