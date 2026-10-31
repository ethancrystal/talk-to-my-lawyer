# Dependabot Audit Run #163 — 2026-06-28

## Summary Metrics

| Metric | Result |
|--------|--------|
| Open Dependabot PRs | **0** |
| Total historical bot PRs | **49** (all closed/merged) |
| CVEs (`pnpm audit`) | **0** ✅ |
| Safe updates applied this run | **4** |
| Deferred major-version upgrades | **8** |
| Active `pnpm.overrides` CVE pins | **19** |
| Total lockfile packages | **788** |

---

## Dependabot PR Status

**No open Dependabot PRs — nothing to merge or close.**

GitHub Dependabot has 49 total historical PRs, all closed or merged. The automated audit confirms no new PRs were opened since run #162.

---

## Updates Applied This Run

All 4 updates are patch or minor releases with no breaking changes. TypeScript check (`pnpm check`) passes clean after application.

| Package | Old | New | Type | Notes |
|---------|-----|-----|------|-------|
| `@tanstack/react-query` | 5.101.1 | 5.101.2 | patch | Bug-fix release; object-form API unchanged |
| `postcss` | 8.5.15 | 8.5.16 | patch | CSS processing bug-fix; no API change |
| `prettier` | 3.9.0 | 3.9.1 | patch | Formatter bug-fix; output diffs are formatting-only |
| `lucide-react` | 1.21.0 | 1.22.0 | minor | Already on v1.x; new icons added, existing icons unchanged |

---

## 8 Deferred Major Upgrades

These are intentionally held back; each has a documented blocker that requires a dedicated migration sprint.

| Package | Current | Latest | Blocker |
|---------|---------|--------|---------|
| `typescript` | 5.9.3 | 6.0.3 | `types:[]` default drops Node globals — requires explicit `types` audit across `server/` |
| `ai` | 6.0.208 | 7.0.4 | ESM-only build; CJS server is a hard blocker; must upgrade atomically with ai-sdk peers |
| `@ai-sdk/anthropic` | 3.0.85 | 4.0.1 | Blocked on `ai@7` |
| `@ai-sdk/openai` | 3.0.74 | 4.0.2 | Blocked on `ai@7` |
| `express` | 4.22.2 | 5.2.1 | Query parser breaking change — may break tRPC batch queries; requires integration test |
| `@types/express` | 4.17.21 | 5.0.6 | Gated on Express 5 migration |
| `pnpm` | 10.34.4 | 11.9.0 | v11 silently discards `pnpm.overrides` → must migrate all 19 CVE pins to `pnpm-workspace.yaml` first |
| `puppeteer` | 24.43.1 | 25.2.1 | ESM-only; bundle upgrade with `ai@7` sprint |

---

## CVE Status

```
pnpm audit → No known vulnerabilities found ✅
```

> ⚠️ **Do NOT upgrade pnpm to v11** before migrating the 19 `pnpm.overrides` entries to `pnpm-workspace.yaml`. v11 silently discards them, re-exposing all patched CVEs.

### Active `pnpm.overrides` CVE Pins (19)

| Override | Pinned To |
|----------|-----------|
| `tailwindcss>nanoid` | `3.3.7` |
| `fast-xml-parser` | `5.7.2` |
| `esbuild` | `0.28.1` |
| `path-to-regexp` | `0.1.13` |
| `picomatch` | `4.0.4` |
| `brace-expansion` | `5.0.6` |
| `langsmith` | `>=0.6.0` |
| `fast-xml-builder` | `>=1.1.7` |
| `qs` | `>=6.15.2` |
| `@tootallnate/once` | `3.0.1` |
| `basic-ftp@<=5.2.1` | `>=5.2.2` |
| `basic-ftp@=5.2.0` | `>=5.2.1` |
| `dompurify@<=3.3.3` | `>=3.4.0` |
| `dompurify@<=3.4.10` | `>=3.4.11` |
| `@xmldom/xmldom` | `0.9.10` |
| `uuid` | `14.0.0` |
| `postcss@<8.5.10` | `>=8.5.10` |
| `form-data@<2.5.6` | `>=2.5.6` |
| `@opentelemetry/core@<2.8.0` | `>=2.8.0` |

---

## Recommended Next Steps

1. **ESM migration sprint** — unblocks `ai@7`, both `@ai-sdk/*@4`, and `puppeteer@25` at once
2. **pnpm overrides migration** — move 19 pins to `pnpm-workspace.yaml` before upgrading to pnpm v11
3. **Express 5 integration test** — validate tRPC batch queries with new query parser before merging
4. **TypeScript 6 migration** — audit `server/` for implicit Node globals, add explicit `types` entries
5. **Node 26 Docker watch** — schedule base image bump when Node 26 reaches LTS (estimated late 2026)
