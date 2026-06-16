# Dependabot PR Audit — 2026-06-12

**Run date:** 2026-06-12  
**Repository:** moizj00/ttml-app  
**Triggered by:** Manual request

---

## Result: No Open Dependabot PRs

There are **zero open Dependabot PRs** in this repository at the time of this audit.

---

## Historical Context

All 49 historically created Dependabot PRs have been resolved:
- **39 merged** — dependency updates accepted and integrated
- **10 closed without merge** — deemed unnecessary, risky, or incompatible

---

## Audit Decision Log

| PR # | Package | Decision | Reason |
|------|---------|----------|--------|
| — | — | No action required | No open Dependabot PRs at time of audit |

---

## Concurrent PR Activity

During this audit session, **PR #197** was opened (not a Dependabot PR):

- **Title:** `seo: add sitewide WebSite entity and link Organization graph`
- **Author:** moizj00 (human)
- **Branch:** `claude/admiring-cerf-el1qjc` → `main`
- **Changes:** 2 files, +19 additions
- **Summary:**
  - Added a `WebSite` JSON-LD block to `client/index.html` served in the static shell for JS-blind crawlers and AI answer bots
  - Gave the static `LegalService` node a stable `@id` (`#organization`) plus `logo`/`image` fields
  - Added `@id` to the client-side `Organization` node in `App.tsx` so all three entities (`WebSite` → `publisher` → `Organization`/`LegalService`) form a coherent linked graph
- **Validation:** `pnpm check` clean; `spaRoutes.test.ts` 18/18 passed
- **State:** Open, awaiting review
- **URL:** https://github.com/moizj00/ttml-app/pull/197

---

## Recommendations

1. **Dependabot re-enable check** — Verify Dependabot is still configured and enabled in `.github/dependabot.yml`. Zero open PRs could mean all deps are up-to-date, or it could mean Dependabot is paused/misconfigured.
2. **Next audit** — Schedule a re-check in 2–4 weeks to catch any new dependency alerts.
3. **PR #197** — Review and merge when ready; changes are low-risk SEO-only structured data additions with no server logic touched.

---

## Methodology

1. Listed all open PRs via GitHub API (91 total found)
2. Filtered for `author: dependabot[bot]` — none found
3. Cross-referenced with historical PR comments confirming 49 prior Dependabot PRs all resolved
4. Documented concurrent human-authored PR activity for completeness
