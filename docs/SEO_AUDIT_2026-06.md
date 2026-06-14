# SEO Audit — talk-to-my-lawyer.com (June 2026)

> Scheduled review of all public pages: which SEO best practices are followed,
> where the site sits on the visibility spectrum, and prioritized changes.
>
> **Method & caveats:** This audit was produced from the codebase (the SEO is
> generated server-side from `server/spaRoutes.ts`, `server/sitemapRoute.ts`,
> `client/index.html`, `client/public/robots.txt`, `client/public/llms.txt`,
> and per-page `Helmet` blocks) plus public web-search checks. Two data sources
> were **not** available this run: (1) the live site returned 404 to the
> automated fetcher (almost certainly Cloudflare bot-blocking of the fetch
> user-agent — allowlisted crawlers such as Googlebot are unaffected; this is
> *not* confirmed downtime), and (2) Semrush MCP is not included in the current
> plan, so authority score / keyword-count / backlink numbers could not be
> pulled. Recommendations that need those metrics are flagged.

---

## TL;DR

**On-page & technical SEO: A-. Off-page authority & actual visibility: F (early-stage).**

The engineering foundation is excellent — arguably better than most competitors
in this niche. The gap is **not** technical; it's **authority and content
depth**. The domain does not currently surface in search for its own brand-ish
terms or core keywords; those SERPs are owned by LegalZoom, Rocket Lawyer,
LawDepot, LetterDash, and law firms. Winning is now a function of content
volume, backlinks, and time — not more meta tags.

---

## 1. What's already done well (keep / don't regress)

| Area | Status | Evidence |
| --- | --- | --- |
| Per-route `<title>` / meta description | ✅ Strong, unique per route | `PUBLIC_ROUTE_SEO` + `SERVICE_ROUTE_SEO` in `server/spaRoutes.ts` |
| Canonical tags | ✅ Injected on every route, www-normalized | `withCanonical()` + `injectSeoIntoHtml()` |
| Open Graph + Twitter cards | ✅ Complete set, per route | `injectSeoIntoHtml()` |
| Robots directives | ✅ `index,follow,max-image-preview:large` on public; `noindex` on app/auth | `INDEX_ROBOTS` / `NOINDEX_ROBOTS`; header defense-in-depth in `server/_core/index.ts` |
| `robots.txt` | ✅ Search allowed, app/API blocked, AI-training bots blocked, sitemap referenced | `client/public/robots.txt` |
| XML sitemap | ✅ Dynamic; static + 10 service pages + all published blog posts | `server/sitemapRoute.ts` |
| Crawlability of a JS SPA | ✅ **Two-phase**: build-time Puppeteer prerender of data-free routes (`scripts/prerender.ts`) + runtime SSR-lite fallback HTML injection (`buildFallbackHtml`) so non-JS crawlers get real `<h1>`/content | `scripts/prerender.ts`, `server/spaRoutes.ts` |
| Blog crawlability | ✅ Full article body injected as fallback HTML for crawlers; blog tRPC read endpoints explicitly allowed in robots.txt | `markdownToFallbackHtml`, robots.txt lines 105–110 |
| Structured data (JSON-LD) | ✅ Broad coverage: `LegalService` (home), `Service`+`OfferCatalog` (pricing), `FAQPage` (FAQ, service pages, blog posts), `Article`+`BreadcrumbList` (blog), `LegalService`+`FAQPage`+`BreadcrumbList` (service pages) | `index.html`, `Pricing.tsx`, `FAQ.tsx`, `BlogPost.tsx`, `services/ServicePage.tsx` |
| AI / answer-engine optimization (GEO) | ✅ `llms.txt` present and served, with explicit citation guidance for answer engines | `client/public/llms.txt` |
| Search-engine verification | ✅ Bing (`msvalidate.01` + `BingSiteAuth.xml`) | `client/index.html`, `client/public/` |
| Local/geo signals | ✅ `geo.region`/`geo.position`/`ICBM` for California | `client/index.html` |
| 404 handling | ✅ Proper HTTP 404 + `noindex` for unknown routes; asset-probe 404 short-circuit | `resolveSpaRoute`, `shouldReturnAsset404` |

This is a mature, deliberate implementation. The team has clearly already done
a serious SEO pass.

---

## 2. Visibility assessment — where we are on the spectrum

**Position: bottom of the curve (technically ready, commercially invisible).**

Web searches for the brand + core keywords (`"talk to my lawyer" demand letter
cease and desist`, `talk-to-my-lawyer.com reviews`) returned **zero** results
for the domain. Every SERP slot is held by established competitors:

- **Templates / DIY:** LegalZoom, LawDepot, Rocket Lawyer
- **Flat-fee letter services:** LetterDash ($199 flat-rate cease-and-desist) — the closest direct competitor and a useful pricing/positioning benchmark
- **Law firms:** Minc Law, Mullen, Hendershot Cowart, etc.

Interpretation:
- The technical foundation means that **as content and links accrue, pages can
  rank** — nothing structural is blocking indexation.
- The absence of *any* footprint indicates the site is **new / low-authority**:
  few backlinks, little indexed content history, no brand search demand yet.
- This is normal for a young site. The lever now is **off-page + content**, not
  more on-page tuning.

> To quantify precisely (authority score, indexed pages, ranking keywords,
> backlink count), pull a Semrush/Ahrefs domain overview or Google Search
> Console (Performance + Coverage). GSC is free and should be the first thing
> wired up if it isn't already.

---

## 3. Findings & recommendations (prioritized)

### P0 — Verify nothing is silently broken
1. **Confirm the live site serves to real crawlers.** The automated fetcher got
   404s on `/`, `/sitemap.xml`, and `/www`. This is most likely Cloudflare
   blocking the bot UA, but **verify** with Google Search Console "URL
   Inspection" (Live Test) on `/`, `/pricing`, a `/services/*` page, and a
   `/blog/*` post. Confirm: 200 status, rendered content present, canonical
   recognized, "Indexing allowed: Yes."
2. **Confirm Puppeteer prerender actually runs in the production build.**
   `scripts/prerender.ts` *gracefully skips* (exits 0) if Chromium can't launch,
   falling back to SSR-lite injection. Verify the deploy environment has
   Chromium / `PUPPETEER_EXECUTABLE_PATH` set, or the richest prerendered HTML
   is not being shipped. (Fallback injection still works, so this is a quality,
   not correctness, issue.)
3. **Submit the sitemap in GSC and Bing Webmaster** if not already, and check
   Coverage for `noindex`/`Discovered – not indexed` pages.

### P1 — Content & authority (the real growth levers)
4. **Publish consistently against long-tail, California-specific intent.** The
   `llms.txt` and service set already map the topic space well. Turn each into
   depth: "how to get your security deposit back in California," "California
   contractor deposit dispute letter," "responding to a cease and desist in
   CA," etc. Volume + freshness is what moves a new domain.
5. **Build backlinks / citations.** Zero authority is the binding constraint.
   Legal directories (Avvo, Justia, FindLaw, Nolo), the Karish Law Firm site
   (link from `karishlawfirm.com` → strong topical relevance), local CA bar /
   business listings, and digital-PR on the "flat-fee vs hourly" angle.
6. **Stand up a Google Business Profile** (or confirm one exists) given the
   strong California-local positioning — local pack + reviews are high-leverage
   for a geo-targeted legal service.
7. **Seed reviews** (Trustpilot / Google). The reviews query returned nothing;
   review schema + real reviews improve CTR and trust signals.

### P2 — On-page polish (small, safe wins)
8. **Social share image is a small square logo.** `og:image` / `twitter:image`
   point to `logo-main.png` (~28 KB icon-sized), but the Twitter card is
   `summary_large_image` and OG previews want ~1200×630. A small logo yields
   weak, unbranded social/answer-engine previews. **Create a 1200×630 branded
   OG banner** and set it as the default `DEFAULT_IMAGE` in `spaRoutes.ts` and
   the static tags in `index.html`. (Requires a design asset — not code-only.)
9. **Sitemap `lastmod` is re-stamped to deploy time for every static page.**
   `LAST_UPDATED = new Date()...` at boot means every static URL claims it
   changed on the last deploy, on every deploy. Google learns to distrust
   `lastmod` when it's always "now." Use a stable, content-derived date (or
   omit `lastmod` on static pages; blog/service `lastmod` from real
   `updatedAt` is correct already). *(Addressed in the accompanying change.)*
10. **`areaServed` inconsistency.** Home/`llms.txt` say California-only;
    `services/ServicePage.tsx` JSON-LD says `areaServed: "US"`. Align to
    `"California"` (or a `State`/`AdministrativeArea` node) so the structured
    data matches the actual, narrower — and more winnable — service area.
11. **Add `Organization`/`WebSite` entity schema** (with `logo`, `sameAs` →
    social/Karish profiles) to strengthen the brand entity / knowledge panel.
    The home page has `LegalService` but no linked `Organization`+`sameAs`.
    *(Needs the real social URLs to be worth shipping.)*
12. **Strategic targeting:** title/description on the home page lean toward
    broad national terms while the offering is California-only. A new, low-
    authority site wins faster by **dominating "California {letter type}"**
    long-tail than competing nationally with LegalZoom. Re-weight copy and
    internal anchors toward CA-qualified phrases.

---

## 4. Bottom line

Technically, this site is in the **top tier** for its niche — prerendering,
SSR-lite fallback, complete structured data, an `llms.txt` for answer engines,
and disciplined robots/canonical handling are all in place and should be
protected from regression. The reason it isn't visible is **authority and
content age, not implementation**. The highest-ROI work from here is off the
page: publish CA-specific content steadily, earn links (starting with the
Karish Law Firm domain), wire up Search Console, and seed reviews. The P2
on-page items are easy polish but will not, by themselves, move rankings.
