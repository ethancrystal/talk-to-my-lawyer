# Dependency Audit — Run 60 (2026-06-11)

**Security posture:** `pnpm audit` = **0 vulnerabilities**
**Packages upgraded this run:** 6
**Open native Dependabot PRs:** 0 (all 49 historical PRs are closed)
**Deferred packages:** 7 (esbuild resolved — now at 0.28.0 on main)

---

## Open Dependabot PRs — Run 60

**Result: 0 open native Dependabot PRs.**

All 49 Dependabot PRs ever opened on this repository have been resolved:

| Outcome | Count |
|---------|-------|
| ✅ Merged | 39 |
| ❌ Closed without merge (superseded or rejected) | 10 |
| **Total** | **49** |

---

## Security Audit

```
pnpm audit (2026-06-11): 0 vulnerabilities
0 critical · 0 high · 0 moderate · 0 low
```

---

## Packages Upgraded This Run

| Package | Before | After | Type | Notes |
|---------|--------|-------|------|-------|
| `@langchain/langgraph-checkpoint-postgres` | `^1.0.2` | `^1.0.3` | **Security fix** | SQL injection via LIKE wildcards in `PostgresStore` namespace labels — patches CVE affecting letter ID/user ID namespace storage. Pin bumped explicitly to enforce 1.0.3+ |
| `@langchain/langgraph` | `^1.3.7` | `^1.4.1` | Minor | Additive: Zod state validation for node return values, `ToolNode` can access graph state via `runtime.state`, bug fix #2519. No breaking changes |
| `ai` (Vercel AI SDK) | `^6.0.199` | `^6.0.200` | Patch | No breaking changes |
| `pg-boss` | `^12.18.2` | `^12.18.3` | Patch | No breaking changes |
| `@aws-sdk/client-s3` | `^3.1065.0` | `^3.1066.0` | Patch | No breaking changes |
| `@aws-sdk/s3-request-presigner` | `^3.1065.0` | `^3.1066.0` | Patch | Paired with `client-s3` |

**TypeScript validation:** `pnpm check` → **clean (0 errors)** after all upgrades.

---

## Superseded Audit PRs (Runs 39–59)

PRs #150–#184 (Runs 37–59) were opened by prior Claude sessions and never merged to main — their package changes are now incorporated here. All are superseded by this run.

| Run | PR | Status |
|-----|----|--------|
| 37 | #150 | ⚠️ Superseded |
| 37 | #151, #152 | ⚠️ Superseded |
| 39 | #154, #155, #157 | ⚠️ Superseded |
| 40 | #156 | ⚠️ Superseded |
| 39–41 | #159 | ⚠️ Superseded |
| 42 | #162 | ⚠️ Superseded |
| 43 | #163 | ⚠️ Superseded |
| 47 | #171 | ⚠️ Superseded |
| 48 | #172 | ⚠️ Superseded |
| 53 | #177 | ⚠️ Superseded |
| 54 | #178 | ⚠️ Superseded |
| 55 | #179 | ⚠️ Superseded |
| 56 | #181 | ⚠️ Superseded |
| 57 | #182 | ⚠️ Superseded |
| 58 | #183 | ⚠️ Superseded |
| 59 | #184 | ⚠️ Superseded |

---

## Deferred Package Matrix (7 packages)

| Package | Current | Latest | Verdict | Blocker |
|---------|---------|--------|---------|---------|
| `wouter` | 3.7.1 | 3.10.0 | ⚠️ BLOCKED | Custom pnpm patch (`patches/wouter@3.7.1.patch`) adding `window.__WOUTER_ROUTES__` to `Switch`; needs patch migration to 3.10.0 |
| `@types/express` | 4.17.21 | 5.0.6 | ❌ SKIP | v5 types require Express 5 runtime — cannot upgrade in isolation |
| `@types/node` | `^24.13.1` | 25.9.3 | ❌ SKIP | Node 25 types on Node 22/24 runtime = false type-safety |
| `express` | `^4.22.2` | 5.2.1 | ⚠️ RISKY | Named wildcards, `res.redirect()` arg-order flip, `req.body` breaking — 20+ routes need migration |
| `pnpm` | `^10.34.1` | 11.5.3 | ⚠️ RISKY | Config moves to `pnpm-workspace.yaml`, env vars renamed, SQLite store rebuild |
| `puppeteer` | `^24.43.1` | 25.1.0 | ⚠️ RISKY | ESM-only (CJS removed); `executablePath()` sync→async breaks `server/pdfGenerator.ts:81` |
| `typescript` | 5.9.3 | 6.0.3 | ⚠️ RISKY | 9 default changes; needs dedicated branch + full `pnpm check` audit |

**Note:** `esbuild` is now resolved — main already carries `0.28.0` (the previously deferred target), removed from deferred list.

### Recommended Next Steps

1. **wouter** — re-apply `window.__WOUTER_ROUTES__` patch against 3.10.0 in an isolated branch
2. **TypeScript 6** — add `"target": "ES2020"` to `tsconfig.json`; lowest-friction upgrade here
3. **Puppeteer 25** — make `resolveChromiumPath()` async in `server/pdfGenerator.ts`
4. **Express 5** — `npx codemod@latest @expressjs/v5-migration-recipe` + `pnpm check` + `pnpm test`
5. **pnpm 11** — config migration + CI env var updates

---

## Closed Without Merge — Decision Rationale (all 10)

| PR | Package | Verdict | Reason |
|----|---------|---------|--------|
| [#2](https://github.com/moizj00/ttml-app/pull/2) | `actions/setup-node 4 → 6` | ❌ SUPERSEDED | Handled via other CI updates |
| [#3](https://github.com/moizj00/ttml-app/pull/3) | `node 22-alpine → 25-alpine` | ❌ REJECTED | Node 25 not LTS |
| [#4](https://github.com/moizj00/ttml-app/pull/4) | `actions/upload-artifact 4 → 7` | ❌ SUPERSEDED | Superseded by other CI updates |
| [#23](https://github.com/moizj00/ttml-app/pull/23) | `node 22-alpine → 26-alpine` | ❌ REJECTED | Node 26 not yet LTS; project on Node 24 LTS; CI failed |
| [#30](https://github.com/moizj00/ttml-app/pull/30) | `@vitejs/plugin-react 5 → 6` | ❌ SUPERSEDED | Superseded by #71 |
| [#35](https://github.com/moizj00/ttml-app/pull/35) | `openai 6.35 → 6.37` | ❌ SUPERSEDED | Superseded by #86 (6.39.0) |
| [#66](https://github.com/moizj00/ttml-app/pull/66) | `openai 6.35 → 6.39` | ❌ SUPERSEDED | Duplicate of #86 |
| [#70](https://github.com/moizj00/ttml-app/pull/70) | `@tiptap/starter-kit 3.23.4 → 3.23.6` | ❌ SUPERSEDED | Superseded by #85 (3.26.0) |
| [#81](https://github.com/moizj00/ttml-app/pull/81) | `@types/node 24 → 25` | ❌ REJECTED | Node 25 types on Node 22 runtime; CI failed |
| [#83](https://github.com/moizj00/ttml-app/pull/83) | `lucide-react 0.x → 1.17.0` | ❌ SUPERSEDED | Already merged via PR #129 |

---

_Generated by [Claude Code](https://claude.ai/code)_
