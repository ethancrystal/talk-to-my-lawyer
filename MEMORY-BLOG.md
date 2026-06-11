# TTML — Blog Content Pipeline Memory

Memory for the **blog writing machine**: harvesting titles → writing posts → publishing to the live app.
Companion to [`MEMORY.md`](MEMORY.md) (repo / code / infra). The blog **CRUD API + DB schema** (`public.blog_posts`, tRPC `blog.*`, REST `/api/blog/publish`) is documented in the repo file — this file is about how content is *produced and shipped*.

---

## Pipeline, end to end

1. **Harvest** — [`scripts/harvest-questions.py`](scripts/harvest-questions.py) (Playwright scraper). Pulls real California legal questions from Reddit (`old.reddit.com`), AlsoAsked, FindQuestions, Google News, with a web-search fallback; filters on a relevance keyword list + question shape.
   - Run: `python harvest-questions.py --output json --limit 60` (needs `pip install playwright && playwright install chromium`).
   - Output: `.claude/harvested-raw-<date>.json` + daily title files; auto-invokes the sync script.

2. **Sync titles** — [`scripts/sync-titles-to-master.py`](scripts/sync-titles-to-master.py). Merges every `.claude/daily-titles-YYYY-MM-DD.md` into the rolling master `.claude/all-daily-titles.md` (grouped by date, newest first), then deletes the per-day files so titles live in one place. Idempotent.
   - Writes under the **canonical `C:\home\tesla_laptops\ttml-app-work\.claude`** (override with `TTML_REPO_ROOT` env or `--claude-dir`). *Was* hardcoded to the `C:\Users\moizjmj` profile — **fixed 2026-06-02** so it always targets tesla_laptops even when Claude is run from the other Windows profile. The same canonical-root resolver was applied to `fix_json.py`, `publish-batch.py`, `publish-batch-inline.py`, and the `run_sync.bat` / `run_fix.bat` launchers.

3. **Title file format** — `.claude/all-daily-titles.md`: per date a header line `harvested_at: … | total_harvested: N | by_source: reddit=… alsoasked=… findquestions=… google_news=… web_search_fallback=…`, then numbered lines `N. <Title> | source: <src>`. The `ttml-blog-batch` skill consumes a *richer* title file (Sections A–D with barrel assignments + keyword/search-volume data).

4. **Write** — the `ttml-blog-batch` skill picks the best titles (by **barrel gap + search volume**) and writes **10 posts/day (5 SHORT + 5 LONG)** through the **columnist → award-columnist → voice-dna** skill pipeline, saving markdown to `blog/` and committing to git.

5. **Publish** — [`scripts/publish-batch.py`](scripts/publish-batch.py) (stdlib only) POSTs markdown to the live endpoint; the `blog-poster` skill wraps it.
   - Endpoint: `https://talk-to-my-lawyer.com/api/blog/publish` (override via `TTML_PUBLISH_ENDPOINT`).
   - Auth key lookup order: `BLOG_PUBLISH_API_KEY` env → `TTML_PUBLISH_KEY_FILE` (path) → `~/.ttml-publish-key` → `.publish-key` beside the script.
   - Blog-dir lookup order: `TTML_BLOG_DIR` → `./blog` → `../blog` → repo-root `/blog` → `~/ttml-app-work/blog`.
   - Examples: `python publish-batch.py --dir blog/ --today` · `… --date 2026-05-25`. Exits 0 only if **every** file returns 2xx.

6. **App** — the endpoint ([`server/blogPublishRoute.ts`](server/blogPublishRoute.ts)) **upserts by slug** into `public.blog_posts`, computes reading time, and invalidates the Cloudflare KV/Worker cache. The app serves posts via tRPC `blog.list` / `blog.getBySlug` (cached) and the public `/blog` site. **128 published** (134 total incl. drafts) as of 2026-06-02.

---

## Blog corpus as letter-generation databank
Plan at [`docs/blog-knowledge-databank-plan.md`](docs/blog-knowledge-databank-plan.md): chunk + embed published posts into a `blog_chunks` pgvector table (Supabase, same `text-embedding-3-small`/1536-dim stack as `letter_versions`), retrieve via a `match_blog_chunks()` RPC, and ground both the LangGraph research node and the simple (free-trial) pipeline behind a `BLOG_RAG_ENABLED` flag. Blogs are background knowledge + statute *leads* only — never quoted; attorney review unchanged.

## Related skills
- `ttml-blog-batch` — the daily 10-post batch (titles → write → commit → publish).
- `blog-poster` — publish-only (markdown → REST API).
- `columnist`, `award-columnist`, `voice-dna` — the writing + quality-gate pipeline.
- `ttml-ceo` — overall TTML strategy / ops context.

## Gotchas
- Harvest data + the master title log live in `.claude/`; the written posts live in `blog/`.
- `category` must be one of `BLOG_CATEGORIES` ([`drizzle/schema/constants.ts`](drizzle/schema/constants.ts)); the publish route infers category from frontmatter `tags` when not explicit, else falls back to `general`.
- Same `gnz`-schema caveat as the repo: the publish endpoint writes only TTML's `public.blog_posts` — never the separate `gnz.blog_posts`.
