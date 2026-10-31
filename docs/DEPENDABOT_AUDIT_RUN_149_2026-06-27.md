# Dependency Audit Run #149 — 2026-06-27

Scheduled Claude Code dependency audit routine.

---

## Summary

| Metric | Result |
|--------|--------|
| Native Dependabot PRs | **0** |
| CVEs (`pnpm audit`) | **0** |
| Updates applied | **0** (no new stable updates since run #147) |
| Active `pnpm.overrides` CVE pins | **19** |
| Deferred major-version upgrades | **8** (unchanged from run #148) |
| Open audit-report PRs (stale) | **100+** (all prior runs' report PRs, all by `moizj00`) |
| Total dependencies scanned | **788** |

---

## Native Dependabot PR Audit

Scanned all open PRs via GitHub API (100 PRs returned in full traversal).

**Result: 0 native Dependabot PRs.**

- `dependabot[bot]` has never authored a PR on this repository.
- `.github/dependabot.yml` is not configured — GitHub Dependabot is not enabled.
- All 100 open PRs examined are prior audit-run report PRs authored by `moizj00` (this same routine). Prior closed native Dependabot PRs (#83, #81, #71, #36, etc.) were resolved historically and remain closed.

**Decision: N/A — no native Dependabot PRs to investigate, merge, or close.**

---

## CVE Audit

`pnpm audit` returned **0 vulnerabilities** across **788** total dependencies.

All 19 `pnpm.overrides` CVE pins confirmed active (unchanged from run #148):

| Override | Pinned to | Vulnerability Class |
|----------|-----------|---------------------|
| `tailwindcss>nanoid` | `3.3.7` | CVE sub-dep pin |
| `fast-xml-parser` | `5.7.2` | XML injection |
| `esbuild` | `0.28.1` | Build tool pin |
| `path-to-regexp` | `0.1.13` | ReDoS |
| `picomatch` | `4.0.4` | Glob ReDoS |
| `brace-expansion` | `5.0.6` | ReDoS |
| `langsmith` | `>=0.6.0` | Security patch floor |
| `fast-xml-builder` | `>=1.1.7` | XML injection |
| `qs` | `>=6.15.2` | Prototype pollution |
| `@tootallnate/once` | `3.0.1` | Version pin |
| `basic-ftp@<=5.2.1` | `>=5.2.2` | FTP security patch |
| `basic-ftp@=5.2.0` | `>=5.2.1` | FTP security patch |
| `dompurify@<=3.3.3` | `>=3.4.0` | XSS bypass |
| `dompurify@<=3.4.10` | `>=3.4.11` | XSS bypass |
| `@xmldom/xmldom` | `0.9.10` | XML security |
| `uuid` | `14.0.0` | UUID version pin |
| `postcss@<8.5.10` | `>=8.5.10` | CSS injection |
| `form-data@<2.5.6` | `>=2.5.6` | Security patch |
| `@opentelemetry/core@<2.8.0` | `>=2.8.0` | Security patch |

> ⚠️ **Critical reminder:** Do NOT upgrade `pnpm` to v11 before migrating all 19 overrides from `package.json` → `pnpm-workspace.yaml`. pnpm v11 silently discards `pnpm.overrides` in `package.json`, re-exposing all patched vulnerabilities.

---

## Updates Applied This Run

**None.** No new stable updates are available. Current versions confirmed:

| Package | Current | Note |
|---------|---------|------|
| `@types/node` | `^26.0.1` | ✅ Up to date (applied run #147) |
| `typescript` | `5.9.3` | Deferred — major blocker |
| `ai` | `^6.0.208` | Deferred — ESM blocker |
| `@ai-sdk/anthropic` | `^3.0.85` | Deferred — v4 canary only |
| `@ai-sdk/openai` | `^3.0.74` | Deferred — v4 canary only |
| `express` | `^4.22.2` | Deferred — query parser risk |
| `@types/express` | `4.17.21` | Deferred — gated on express@5 |
| `pnpm` | `^10.34.4` | Deferred — overrides migration required |
| `puppeteer` | `^24.43.1` | Deferred — ESM-only in v25 |

---

## Deferred Major-Version Upgrades (8 packages — unchanged)

| Package | Current | Latest Stable | Risk | Decision | Reason |
|---------|---------|--------------|------|----------|--------|
| `typescript` | 5.9.3 | 6.0.3 | 🔴 HIGH | ❌ DEFER | `types:[]` default silently removes Node globals; needs dedicated migration |
| `ai` | ^6.0.208 | 7.0.3 | 🔴 HIGH | ❌ DEFER | ESM-only; CJS server is hard blocker; atomic group with ai-sdk peers |
| `@ai-sdk/anthropic` | ^3.0.85 | 3.0.86 stable (v4 = canary only) | 🔴 HIGH | ❌ DEFER | v4.x exists only as canary/beta; blocked on `ai@7` |
| `@ai-sdk/openai` | ^3.0.74 | 3.0.67 stable (v4 = canary only) | 🔴 HIGH | ❌ DEFER | v4.x canary/beta only; blocked on `ai@7` |
| `express` | ^4.22.2 | 5.2.1 | 🟡 MED | ❌ DEFER | Query parser default change may break tRPC batching; needs integration validation |
| `@types/express` | 4.17.21 | 5.0.6 | 🟡 MED | ❌ DEFER | Gated on `express@5` migration |
| `pnpm` | ^10.34.4 | 11.9.0 | 🟡 MED | ❌ DEFER | Must migrate 19 overrides to `pnpm-workspace.yaml` first |
| `puppeteer` | ^24.43.1 | 25.2.1 | 🟡 MED | ❌ DEFER | ESM-only; bundle with `ai@7` ESM migration sprint |

---

## Observations This Run

### 1. No native Dependabot PRs — ever

Dependabot has never been enabled on this repository (`.github/dependabot.yml` is absent). There are no Dependabot-authored PRs to merge, investigate, or close. The historically closed PRs (#83, #81, #71, #36) pre-date current open-PR state and are already resolved.

### 2. Audit-report PR accumulation (100+ open PRs)

The open PR count has grown from 47 (run #148) to 100+ visible via the API. All are prior audit-run report PRs from this routine — none contain actionable changes beyond the `@types/node` update in run #147. **Recommendation:** close or merge all audit PRs prior to this one to reduce repository noise.

### 3. Dependency posture: healthy and static

0 CVEs, 0 native Dependabot PRs, 19 CVE overrides active and effective, 8 deferred majors with documented unblocking paths. The stable ecosystem remains unchanged for the third consecutive run.

### 4. Dep count increased by 1

Total deps: 788 (was 787 in run #148). Minor transitive drift — no action required.

---

## Recommended Next Steps (priority order, unchanged from run #148)

1. **Close/merge stale audit report PRs** — reduce repository noise (100+ open PRs is significant signal noise)
2. **Migrate 19 `pnpm.overrides` → `pnpm-workspace.yaml`** — unblocks `pnpm@11`
3. **Plan ESM migration sprint** — co-upgrade `ai@7` + `@ai-sdk/*@4` + `puppeteer@25`
4. **Plan Express 5 migration** — use official codemod; validate tRPC + webhook surface
5. **Plan TypeScript 6 migration** — add `"types": ["node"]` to tsconfig first
6. **Monitor `@ai-sdk/*` v4 stable release** — check npm weekly until canary graduates

---

## Delta from Run #148

| Change | Detail |
|--------|--------|
| Updates applied | None |
| Deferred count | 8 (unchanged) |
| CVEs | 0 (unchanged) |
| Total deps | 788 (was 787 — +1 transitive) |
| Open audit PRs | 100+ (was 47 in #148; routine has been running prolifically) |
| New findings | None — clean baseline identical to run #148 |
