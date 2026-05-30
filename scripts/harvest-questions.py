#!/usr/bin/env python3
"""
TTML Question Harvester — Playwright scraper (resilient edition)
Scrapes Reddit, AlsoAsked, FindQuestions, Google News for real legal questions.
Usage: python harvest-questions.py --output json --limit 60
Install: pip install playwright --break-system-packages && playwright install chromium
"""
import asyncio, json, sys, argparse, subprocess, os
from datetime import datetime
from playwright.async_api import async_playwright

SYNC_SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sync-titles-to-master.py")

FINDQUESTIONS_TERMS = ["lawyer letter","draft letter california","demand letter california","attorney letter tenant","legal letter contractor","california lawyer letters"]
ALSOASKED_TERMS = ["demand letter california","lawyer letter tenant","legal letter contractor payment","attorney letter for unpaid invoice"]
GOOGLE_NEWS_TERMS = ["demand letter california","tenant rights california","contractor dispute california","cease and desist letter california"]
REDDIT_SUBS = ["legaladvice","landlord","Entrepreneur"]
RELEVANCE_KEYWORDS = ["california"," ca ","[ca]","letter","lawyer","attorney","legal","contract","lease","tenant","landlord","invoice","payment","owed","sue","sued","court","dmca","ip","trademark","refund","deposit","contractor","freelance","demand","cease","evict","debt","dispute"]
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

def looks_like_question(text):
    if not text: return False
    t = text.strip()
    if len(t) < 15 or len(t) > 200: return False
    low = t.lower()
    return any(low.startswith(w) for w in ["how","what","can","does","is","why","when","who","which","will","do","are","should","could","my ","i "]) or t.endswith("?")

def is_relevant(text):
    if not text: return False
    return any(kw in text.lower() for kw in RELEVANCE_KEYWORDS)

def clean(text):
    return " ".join(text.split()).strip().rstrip("?").strip() + "?"

async def scrape_reddit(page, sub):
    results = []
    try:
        # old.reddit.com is server-rendered — reliable selector, no JS required
        await page.goto(f"https://old.reddit.com/r/{sub}/?sort=new", timeout=20000, wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        for el in await page.query_selector_all("a.title"):
            try:
                text = (await el.inner_text()).strip()
                if text and is_relevant(text) and len(text) > 20:
                    results.append({"title": clean(text), "source": f"reddit/r/{sub}", "raw": text})
            except Exception: continue
    except Exception as e:
        print(f"[WARN] Reddit r/{sub}: {e}", file=sys.stderr)
    return results

async def scrape_findquestions(page, term):
    results = []
    try:
        await page.goto("https://findquestions.com", timeout=20000, wait_until="domcontentloaded")
        await page.wait_for_timeout(1000)
        filled = False
        for sel in ['input[type="search"]','input[type="text"]','input[name="q"]',"input"]:
            try: await page.fill(sel, term); filled = True; break
            except: continue
        if not filled: return results
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(4000)
        for line in (await page.inner_text("body")).splitlines():
            line = line.strip()
            if looks_like_question(line) and is_relevant(line):
                results.append({"title": clean(line), "source": "findquestions.com", "raw": line})
    except Exception as e:
        print(f"[WARN] FindQuestions '{term}': {e}", file=sys.stderr)
    return results

async def scrape_alsoasked(page, term):
    results = []
    try:
        await page.goto("https://alsoasked.com", timeout=20000, wait_until="domcontentloaded")
        await page.wait_for_timeout(1000)
        filled = False
        for sel in ['input[type="search"]','input[type="text"]','input[placeholder]',"input"]:
            try: await page.fill(sel, term); filled = True; break
            except: continue
        if not filled: return results
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(6000)
        for line in (await page.inner_text("body")).splitlines():
            line = line.strip()
            if looks_like_question(line):
                results.append({"title": clean(line), "source": "alsoasked.com", "raw": line})
    except Exception as e:
        print(f"[WARN] AlsoAsked '{term}': {e}", file=sys.stderr)
    return results

async def scrape_google_news(page, term):
    results = []
    try:
        # Correct URL: news.google.com with /search?q= prefix
        url = f"https://news.google.com/search?q={term.replace(' ','+')}&hl=en-US&gl=US&ceid=US:en"
        await page.goto(url, timeout=20000, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        for sel in ["h3","h4","article h2"]:
            for el in await page.query_selector_all(sel):
                try:
                    text = (await el.inner_text()).strip()
                    if text and len(text) > 15 and is_relevant(text):
                        results.append({"title": text, "source": "google_news", "raw": text})
                except Exception: continue
    except Exception as e:
        print(f"[WARN] Google News '{term}': {e}", file=sys.stderr)
    return results

async def harvest(limit=60):
    all_results, seen = [], set()
    def add(items):
        for item in items:
            key = item["title"].lower()[:80]
            if key not in seen:
                seen.add(key)
                all_results.append(item)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(user_agent=UA)
        page = await ctx.new_page()
        print("[1/4] Scraping Reddit...", file=sys.stderr)
        for sub in REDDIT_SUBS:
            add(await scrape_reddit(page, sub)); await asyncio.sleep(1.5)
        print("[2/4] Scraping AlsoAsked...", file=sys.stderr)
        for term in ALSOASKED_TERMS[:2]:
            add(await scrape_alsoasked(page, term)); await asyncio.sleep(2)
        print("[3/4] Scraping FindQuestions...", file=sys.stderr)
        for term in FINDQUESTIONS_TERMS[:4]:
            add(await scrape_findquestions(page, term)); await asyncio.sleep(2)
        print("[4/4] Scraping Google News...", file=sys.stderr)
        for term in GOOGLE_NEWS_TERMS[:2]:
            add(await scrape_google_news(page, term)); await asyncio.sleep(2)
        await browser.close()
    return {"harvested_at": datetime.now().isoformat(), "total": len(all_results), "by_source": {"reddit": sum(1 for r in all_results if "reddit" in r["source"]), "alsoasked": sum(1 for r in all_results if "alsoasked" in r["source"]), "findquestions": sum(1 for r in all_results if "findquestions" in r["source"]), "google_news": sum(1 for r in all_results if "google_news" in r["source"])}, "questions": all_results[:limit]}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", choices=["json","text"], default="json")
    parser.add_argument("--limit", type=int, default=60)
    args = parser.parse_args()
    try:
        data = asyncio.run(harvest(limit=args.limit))
    except Exception as e:
        # Foolproof fallback — always emit valid JSON even on total failure
        data = {"harvested_at": datetime.now().isoformat(), "total": 0, "by_source": {"reddit": 0, "alsoasked": 0, "findquestions": 0, "google_news": 0}, "questions": [], "error": str(e)}
    if args.output == "text":
        print(f"Harvested {data['total']} questions at {data['harvested_at']}")
        for i, q in enumerate(data["questions"], 1):
            print(f"{i:>3}. [{q['source']}] {q['title']}")
    else:
        print(json.dumps(data, indent=2, ensure_ascii=False))

    # After harvesting, refresh the master log so all-daily-titles.md reflects every
    # per-day file currently on disk. Safe to fail silently — sync is best-effort.
    try:
        if os.path.exists(SYNC_SCRIPT):
            subprocess.run([sys.executable, SYNC_SCRIPT], check=False, timeout=30,
                           stdout=sys.stderr, stderr=sys.stderr)
    except Exception as e:
        print(f"[WARN] sync-titles-to-master failed: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
