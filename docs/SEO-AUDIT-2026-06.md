# SEO Audit — talk-to-my-lawyer.com

**Date:** 2026-06-26
**Scope:** All public-facing pages (home, pricing, FAQ, services, blog, legal), crawlability, structured data, indexability, and AI-answer-engine readiness.
**Method:** Live `curl` inspection of the production site (raw HTML as crawlers receive it, not JS-rendered) cross-referenced with the source in this repo.

> **Visibility data caveat:** Third-party visibility/ranking/backlink numbers (Semrush) could not be pulled — the connected Semrush plan does not include MCP API access. The "Visibility" section below is therefore a *qualitative, on-page* assessment based on what is technically indexable, not a keyword-ranking report. To get hard numbers (organic keywords, traffic, authority score, backlinks), connect Google Search Console + a Semrush/Ahrefs plan with API access.

---

## 1. Verdict

The SEO foundation is **strong and unusually well-engineered for a SPA** — this is top-decile technical SEO for a React app. The team has clearly invested in crawlability: a hybrid prerender + server-side meta-injection pipeline, a dynamic XML sitemap, a nuanced `robots.txt`, an `llms.txt`, geo-targeting, and rich structured data on the marketing pages.

The biggest opportunity is the **blog** — which is the site's primary organic-traffic engine (≈300+ of the ~343 sitemap URLs) yet is the *only* surface that ships to crawlers **without its page-specific structured data** (`Article` / `BlogPosting` and `BreadcrumbList`). Fixing that is the single highest-leverage change available.

---

## 2. What's done well (best practices already followed)

| Area | Status | Evidence (live) |
| --- | --- | --- |
| **Crawlable SPA** | ✅ Excellent | Homepage ships ~104 KB of fully prerendered HTML incl. real `<h1>` and body copy — not an empty JS shell. |
| **Unique title per page** | ✅ | Home, Pricing, FAQ, Services, each service, Blog index, each post all carry distinct, keyword-led `<title>`s. |
| **Meta descriptions** | ✅ | Present and hand-written/relevant on every public page checked. |
| **Canonical tags** | ✅ | Every page emits `<link rel="canonical">` on the `www` host; the non-`www` host correctly self-canonicalizes to `www`. |
| **`robots` directives** | ✅ | `index, follow, max-image-preview:large` site-wide; private/app routes disallowed. |
| **Open Graph / Twitter** | ✅ | `og:title/url/type/image` + `twitter:card=summary_large_image` present; blog posts correctly use `og:type=article` with `article:published_time` / `modified_time`. |
| **XML sitemap** | ✅ | Dynamic `/sitemap.xml`, ~343 URLs, per-URL `<lastmod>` / `<changefreq>` / `<priority>`, blog `lastmod` driven by real `updatedAt`. |
| **robots.txt** | ✅ Sophisticated | "search=yes, ai-train=no": blocks training-only bots (GPTBot, CCBot, Google-Extended, anthropic-ai, Bytespider) while allowing search + answer engines (Googlebot, Bingbot, OAI-SearchBot, PerplexityBot, ClaudeBot). Sitemap referenced. |
| **AI answer-engine readiness** | ✅ Ahead of the curve | `llms.txt`, "Quick Answer" callouts on posts, FAQ schema, answer-bot allowlist. |
| **Structured data (marketing)** | ✅ | `Organization`, `WebSite`, `LegalService` + `OfferCatalog` (site-wide); `LegalService` + `FAQPage` + `BreadcrumbList` on service pages; `ItemList` on services index. |
| **Local/geo targeting** | ✅ | `geo.region=US-CA`, `geo.placename=California`, ICBM coords; `areaServed: California` in schema. |
| **Mobile / viewport / lang** | ✅ | `<html lang="en">`, responsive viewport meta. |
| **Performance hints** | ✅ | `preconnect` / `dns-prefetch` for Google Fonts, `display=swap`. |
| **Content depth** | ✅ | ~300+ long-form posts targeting high-intent long-tail queries (demand letters, unpaid invoices, security deposits, mechanics liens, landlord/tenant, IP/DMCA). Strong topical-authority play. |

---

## 3. Gaps & recommendations (prioritized)

### 🔴 P1 — Blog posts ship without `Article` + `BreadcrumbList` structured data — ✅ FIXED IN THIS PR

**Finding (verified live):** On `/blog/<slug>` the raw HTML contains **zero** `Article`/`BlogPosting`/`NewsArticle` schema and **zero** `BreadcrumbList`. Distinctive article prose *is* present (~1,300 words rendered), and `<title>` / description / canonical / `og:type=article` are injected server-side — but the post-specific JSON-LD is **client-side only** (React Helmet in `client/src/pages/BlogPost.tsx`).

**Root cause (in code):**
- `server/spaRoutes.ts` injects meta tags and `article:*` OG tags but emits **no JSON-LD** (`grep` for `ld+json` across `server/` returns nothing).
- Blog routes are **excluded from the build-time Puppeteer prerender** (`scripts/prerender.ts`) because they need tRPC + DB. So the only place `Article`/`Breadcrumb` schema exists is the client bundle.
- Result: Googlebot (which renders JS) *may* eventually see it, but **AI answer engines and non-rendering crawlers do not** — and rich-result eligibility (Article rich results, breadcrumb trails in SERPs) is left on the table for the site's largest content surface.

**Fix shipped in this PR:** `server/spaRoutes.ts` now generates `Article` + `BreadcrumbList` JSON-LD **server-side** for every blog post and injects it into the document `<head>` (new `jsonLd?: string[]` field on `RouteSeo`, emitted in `injectSeoIntoHtml`). The schema is *appended*, never stripped, so the site-level `Organization`/`WebSite`/`LegalService` schema in the static shell is preserved. The blocks are escaped for safe `<script>` embedding (`serializeJsonLd`). A regression test (`server/spaRoutes.test.ts`) asserts `/blog/<slug>` HTML contains `"@type":"Article"`, `"@type":"BreadcrumbList"`, and the correct `datePublished`/`dateModified`. The shape mirrors the client-side Helmet schema in `client/src/pages/BlogPost.tsx` so rendering and non-rendering crawlers see a consistent entity.

**Impact:** High. Unlocks Article + breadcrumb rich results and makes the traffic-driving content citable by AI answer engines without JS execution.

---

### 🟠 P2 — Verify FAQPage schema matches *visible* on-page content

**Finding (verified live):** `/blog/<slug>` and `/faq` both serve an identical **27-question `FAQPage`** block. If that 27-Q set is a *global* FAQ injected onto blog posts (rather than the post's own visible Q&A), it violates Google's structured-data policy ("FAQPage markup must match FAQ content visible on the page"), which can trigger a manual action or rich-result suppression.

**Recommendation:** Confirm whether the FAQ schema on each blog post reflects Q&A actually rendered on *that* post (the `extractFaqSchema()` H2-extraction path) vs. the site-wide FAQ. If it's the global FAQ, scope FAQ JSON-LD to pages where those questions are visibly present (i.e., `/faq` only, plus per-post extracted FAQs on posts that contain them).

**Impact:** Medium — protects existing rich-result eligibility from a policy violation.

---

### 🟠 P3 — `www` vs non-`www` both return `200` (no 301)

**Finding (verified live):** `https://talk-to-my-lawyer.com/` and `https://www.talk-to-my-lawyer.com/` **both return `200`** — there is no host-level redirect. Duplicate-content risk is *mitigated* because the non-`www` page self-canonicalizes to `www`, but best practice is a hard **301 from the non-canonical host** to consolidate signals and avoid wasted crawl budget.

**Recommendation:** Add a 301 redirect non-`www` → `www` (or vice versa) at the edge/host layer (Railway/Cloudflare/Express). Keep it consistent with the canonical host already used in the sitemap and canonical tags (`www`).

**Impact:** Medium-low — link-equity consolidation, cleaner crawl.

---

### 🟡 P4 — Empty `sameAs` (no entity/social signals)

**Finding:** `Organization` JSON-LD ships `"sameAs": []`. Search engines use `sameAs` (LinkedIn, X, Facebook, Crunchbase, the law firm's bar profile, etc.) to disambiguate and strengthen the brand entity / Knowledge Panel.

**Recommendation:** Populate `sameAs` with the firm's real social/professional profiles. Pairs well with building the brand entity (the schema already names "Karish Law Firm, CA Bar #205440" — link the State Bar profile).

**Impact:** Low-medium — entity trust / brand SERP.

---

### 🟡 P5 — Off-page / authority (cannot measure here, flagging)

The site's *technical* and *on-page* SEO is excellent, but rankings are gated by **domain authority and backlinks**, which on-page work can't move alone. The `lastmod` dates cluster in **May–June 2026**, indicating the content engine ramped recently — so the site is likely still early in earning authority and indexation.

**Recommendation (off-page, owner action):**
1. Verify the property in **Google Search Console** + **Bing Webmaster Tools**; submit the sitemap; watch Coverage/Indexing for the ~300 posts (new sites often have large "Discovered – not indexed" backlogs).
2. Build a **digital PR / linkable-asset** plan (the cost-vs-litigation breakdowns and state-specific guides are natural link bait for legal-aid and small-business sites).
3. Get listed in relevant **legal directories** and the firm's bar-association profile (also feeds P4 `sameAs`).

**Impact:** This is where real visibility gains will come once the technical base (already strong) is fully indexed.

---

### 🟢 P6 — Minor polish

- **Title brand suffix length:** Several titles run long (e.g. the 3-day-notice post title is ~130 chars); Google truncates ~60 chars. Front-load the keyword (already mostly done) and consider trimming the "— Talk to My Lawyer Blog" suffix on the longest ones.
- **Image SEO:** Confirm post hero/OG images set descriptive `alt` and that `og:image` resolves per-post (not just the site logo) — per-post OG images lift social/answer-engine CTR.
- **Internal linking:** With 300+ posts, ensure a strong topic-cluster internal-link structure (pillar service pages ↔ supporting posts) to spread authority and help discovery of deep posts.

---

## 4. Suggested implementation order

1. **P1** — server-side `Article` + `BreadcrumbList` JSON-LD for blog posts (`server/spaRoutes.ts`, + test). *Highest leverage, contained code change.*
2. **P2** — audit/scope FAQPage schema to visible content. *Risk reduction.*
3. **P3** — non-`www` → `www` 301 at the host layer. *Config change.*
4. **P4** — populate `Organization.sameAs`. *One-line content change.*
5. **P5/P6** — off-page (GSC verification, link building) + polish. *Ongoing, owner-driven.*

---

*Generated as part of a scheduled SEO review routine. Findings under §2/§3 were verified against the live production HTML on 2026-06-26.*
