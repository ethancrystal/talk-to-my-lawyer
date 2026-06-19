# Dependency Audit — 2026-06-19 (Run 120)

Automated dependency health check. 779 total packages audited.

---

## Vulnerability Scan

```
pnpm audit — 0 vulnerabilities across 779 packages
```

**Result: Clean.**

---

## Updates Applied (16 packages merged)

### Patch Updates (13) — Safe by definition

| Package | From | To |
|---------|------|----|
| `@tiptap/extension-highlight` | 3.27.0 | 3.27.1 |
| `@tiptap/extension-placeholder` | 3.27.0 | 3.27.1 |
| `@tiptap/extension-text-align` | 3.27.0 | 3.27.1 |
| `@tiptap/extension-underline` | 3.27.0 | 3.27.1 |
| `@tiptap/pm` | 3.27.0 | 3.27.1 |
| `@tiptap/react` | 3.27.0 | 3.27.1 |
| `@tiptap/starter-kit` | 3.27.0 | 3.27.1 |
| `nanoid` | 5.1.11 | 5.1.14 |
| `stripe` | 22.2.1 | 22.2.2 |
| `@aws-sdk/client-s3` | 3.1071.0 | 3.1072.0 |
| `@aws-sdk/s3-request-presigner` | 3.1071.0 | 3.1072.0 |
| `@sentry/node` | 10.58.0 | 10.59.0 |
| `@sentry/react` | 10.58.0 | 10.59.0 |

### Minor Updates (3) — Changelog-verified, no breaking changes

| Package | From | To | Key Finding |
|---------|------|----|-------------|
| `pg` | 8.21.0 | 8.22.0 | Adds `sslnegotiation=direct` for PostgreSQL 17+; no breaking changes |
| `pg-boss` | 12.19.1 | 12.20.0 | Improved distributed DB support; no breaking changes |
| `@anthropic-ai/sdk` | 0.104.2 | 0.105.0 | New `code_execution_20260120` tool support; lazy partial tool JSON stream parsing; no breaking changes |

**Merge basis:** 0 vulnerabilities, `pnpm check` clean (TypeScript), all minor changelogs manually verified.

---

## Updates Skipped (6 packages — major version bumps)

| Package | Current | Latest | Reason Skipped |
|---------|---------|--------|----------------|
| `express` | 4.22.2 | 5.2.1 | **Express v5 is a major rewrite** — async error handling, path matching, and many removed APIs. Requires coordinated migration. |
| `@types/express` | 4.17.21 | 5.0.6 | Blocked on `express` v5 migration above. |
| `@types/node` | 24.13.1 | 26.0.0 | Node 26 types require Node 26 runtime — infrastructure change, not a dep bump. |
| `pnpm` | 10.34.1 | 11.8.0 | Major lockfile format changes; may break CI and install scripts without coordinated upgrade. |
| `puppeteer` | 24.43.1 | 25.1.0 | Major version; API surface changes. Low-risk standalone but needs explicit testing of PDF generation path. |
| `typescript` | 5.9.3 | 6.0.3 | **TypeScript 6 is a major release** — stricter type-checking, removed legacy emit targets. Requires dedicated migration + full type-check audit. |

---

## Summary

| Metric | Value |
|--------|-------|
| Total packages | 779 |
| Vulnerabilities | **0** |
| Packages updated | **16** |
| Packages skipped (major) | 6 |
| TypeScript check | **Clean** |
