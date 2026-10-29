#!/usr/bin/env python3
"""
TTML Gold Dataset Builder for Unsloth / Qwen Fine-Tuning

Converts the project's human-approved "gold standard" content into
chat-format JSONL exactly matching the shape used by the production
training-capture.ts (messages with system/user/assistant).

This lets you fine-tune a local Qwen so it permanently internalizes
the TTML voice: concrete California statutes + dollar amounts + the
"other side priced your silence" opening bet, tight steps/tables,
reassuring-but-firm tone, strong closers, no AI tells.

Sources (by default):
- Letter templates: ./gold-sources/Template-*-Letter*.html   (structure + attorney stamp tone)
- Blog posts:       ~/Obsidian/root/TTML-Blog/*.md           (or --blog-dir)
                    + any .md you dropped into ./gold-sources/

Output:
- dataset.jsonl     (one JSON object per line, ready for train.py)
- dataset_info.json (counts + source summary)

Usage examples:
    python prepare_gold_dataset.py --dry-run --limit 4
    python prepare_gold_dataset.py --output dataset.jsonl --max-examples 40
    python prepare_gold_dataset.py --blog-dir /path/to/more/gold --include-blogs --include-letters
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

# Try optional HTML parser for nicer letter extraction
try:
    import html2text  # type: ignore
    HAVE_HTML2TEXT = True
except ImportError:
    HAVE_HTML2TEXT = False

try:
    from bs4 import BeautifulSoup  # type: ignore
    HAVE_BS4 = True
except ImportError:
    HAVE_BS4 = False


def strip_frontmatter(text: str) -> str:
    """Remove leading YAML frontmatter if present."""
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            return parts[2].strip()
    return text.strip()


def clean_blog_body(text: str) -> str:
    """Light cleanup for blog bodies."""
    text = strip_frontmatter(text)
    # Remove Obsidian-style route stub noise if present
    text = re.sub(r"^# /blog/.*?\n.*?(?=^#|\Z)", "", text, flags=re.M | re.S)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_title_from_md(text: str, fallback: str) -> str:
    m = re.search(r"^#\s+(.+?)$", text, re.M)
    if m:
        return m.group(1).strip()
    # Try frontmatter title
    m = re.search(r"^title:\s*['\"]?(.+?)['\"]?\s*$", text, re.M | re.I)
    return m.group(1).strip() if m else fallback


def build_letter_messages(html_path: Path) -> list[dict[str, Any]]:
    """
    Turn one approved/draft letter HTML into 1-2 strong training examples.
    We focus on the professional structure, tone, and the "ATTORNEY REVIEWED" stamp.
    """
    raw = html_path.read_text(encoding="utf-8", errors="ignore")

    # Try to pull the meta line
    meta = re.search(r'class="meta"[^>]*>(.*?)</div>', raw, re.S)
    meta_text = meta.group(1).strip() if meta else "Demand Letter · California"

    # Best-effort body extraction
    body_html = ""
    if HAVE_BS4:
        soup = BeautifulSoup(raw, "html.parser")
        body_div = soup.select_one(".body") or soup.find("body")
        if body_div:
            body_html = str(body_div)
    else:
        m = re.search(r'class="body"[^>]*>(.*?)</div>\s*<div class="stamp', raw, re.S)
        body_html = m.group(1) if m else raw

    # Convert to readable text
    if HAVE_HTML2TEXT:
        h = html2text.HTML2Text()
        h.body_width = 0
        letter_text = h.handle(body_html).strip()
    else:
        # Very rough fallback
        letter_text = re.sub(r"<[^>]+>", " ", body_html)
        letter_text = re.sub(r"\s+", " ", letter_text).strip()

    # Make the letter text a bit more "gold" by keeping the spirit even if placeholders remain
    if len(letter_text) < 200:
        letter_text = (
            "I am writing on behalf of [CLIENT] regarding [MATTER]. This letter serves as formal notice...\n\n"
            "[DETAILED FACTS AND STATUTE CITATIONS]\n\n"
            "Demand: [SPECIFIC RELIEF] by [DEADLINE].\n\n"
            "Respectfully submitted,\nTalk-To-My-Lawyer\nOn Behalf of [CLIENT]\n\n"
            "[ATTORNEY REVIEWED & APPROVED stamp]"
        )

    # Create two variants: one very close to production intake style, one more "write me a letter like this"
    examples = []

    # Variant 1 — production-like (what the real capture does)
    user1 = (
        "Letter Type: Demand Letter\n"
        f"Subject: {meta_text}\n"
        "Jurisdiction: California, US\n"
        "Issue: A California party needs a professional, attorney-reviewed demand letter that cites the correct statutes, "
        "states the facts clearly, sets a firm but reasonable deadline, and ends with the official TTML attorney stamp. "
        "Tone must be reassuring to the client and firm toward the recipient."
    )
    system1 = (
        "You are the Talk to My Lawyer drafting team. You write precise, statute-citing legal demand letters for "
        "California individuals and small businesses. You always open by naming the bet the other side is making, "
        "quote the key Civil Code or Business & Professions Code language, include concrete dollar amounts and deadlines, "
        "use short varied sentences, and close with the ATTORNEY REVIEWED & APPROVED stamp block. Never hedge. "
        "Never sound like generic AI."
    )
    assistant1 = letter_text
    examples.append({
        "messages": [
            {"role": "system", "content": system1},
            {"role": "user", "content": user1},
            {"role": "assistant", "content": assistant1},
        ]
    })

    # Variant 2 — explicit style transfer / "make it sound like our approved letters"
    user2 = (
        "Write a professional TTML-style attorney-reviewed demand letter for a California matter. "
        "Use the exact visual and tonal conventions from our approved templates: clear header with matter type and jurisdiction, "
        "full party blocks, strong Re: line, formal-but-accessible body with statute citations and specific demands + deadline, "
        "respectful closing, and the blue 'ATTORNEY REVIEWED & APPROVED' stamp box at the bottom with review date."
    )
    examples.append({
        "messages": [
            {"role": "system", "content": system1},
            {"role": "user", "content": user2},
            {"role": "assistant", "content": assistant1},
        ]
    })

    return examples


def build_blog_messages(md_path: Path) -> list[dict[str, Any]]:
    raw = md_path.read_text(encoding="utf-8", errors="ignore")
    if "Route stub" in raw and len(raw) < 400:
        return []  # skip link stubs

    title = extract_title_from_md(raw, md_path.stem)
    body = clean_blog_body(raw)

    if len(body) < 250:
        return []

    # Craft a realistic "user request" that a content person or the model would get
    user = (
        f"Write a clear, reassuring, expert TTML blog post titled \"{title}\" for California individuals and small "
        "business owners who have already tried asking nicely and are now considering their legal options. "
        "Open by naming the bet the other side is making. Cite the actual California code sections with the key phrases. "
        "Include specific dollar amounts, deadlines, and practical steps. Use tables or numbered lists where they help. "
        "End on a strong line the reader can quote. Match the exact TTML voice: concrete, no hedging, varied sentence length, "
        "empowering without being salesy."
    )

    system = (
        "You are the Talk to My Lawyer content team. You write for California readers who have already tried polite requests "
        "and are now dealing with landlords, contractors, clients, or companies that are counting on them staying silent. "
        "Every post names the other side's bet, quotes the governing statute, gives exact timelines and dollar consequences, "
        "uses short paragraphs and occasional powerful one-liners, and ends with a line the reader can take into a conversation "
        "or a letter. You never use generic AI filler, never moralize, and never end with a summary zinger."
    )

    return [{
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
            {"role": "assistant", "content": body},
        ]
    }]


def main():
    parser = argparse.ArgumentParser(description="Build TTML gold dataset.jsonl for Unsloth fine-tuning")
    parser.add_argument("--output", default="dataset.jsonl", help="Output JSONL path")
    parser.add_argument("--info", default="dataset_info.json", help="Output info JSON path")
    parser.add_argument("--blog-dir", default=str(Path.home() / "Obsidian/root/TTML-Blog"),
                        help="Directory containing the polished TTML-Blog .md files")
    parser.add_argument("--letters-dir", default="gold-sources",
                        help="Directory containing the approved/draft letter HTML templates")
    parser.add_argument("--max-examples", type=int, default=60, help="Cap total examples")
    parser.add_argument("--limit", type=int, default=0, help="Alias for --max-examples (convenience)")
    parser.add_argument("--include-blogs", action="store_true", default=True)
    parser.add_argument("--include-letters", action="store_true", default=True)
    parser.add_argument("--dry-run", action="store_true", help="Print a few examples and exit without writing files")
    args = parser.parse_args()

    if args.limit:
        args.max_examples = args.limit

    root = Path(__file__).parent.resolve()
    blog_dir = Path(args.blog_dir).expanduser()
    letters_dir = root / args.letters_dir if not Path(args.letters_dir).is_absolute() else Path(args.letters_dir)

    all_examples: list[dict[str, Any]] = []
    sources_used: list[str] = []

    # Letters first (they are the strongest "approved by human attorney" signal)
    if args.include_letters:
        letter_files = sorted(letters_dir.glob("Template-*-Letter*.html"))
        print(f"Found {len(letter_files)} letter template(s) in {letters_dir}")
        for lf in letter_files:
            try:
                exs = build_letter_messages(lf)
                all_examples.extend(exs)
                sources_used.append(str(lf.relative_to(root)))
            except Exception as e:
                print(f"  Warning: failed to parse {lf.name}: {e}", file=sys.stderr)

    # Blogs
    if args.include_blogs:
        if blog_dir.exists():
            md_files = sorted(blog_dir.glob("*.md"))
            print(f"Found {len(md_files)} .md file(s) in blog dir: {blog_dir}")
            for mf in md_files:
                try:
                    exs = build_blog_messages(mf)
                    all_examples.extend(exs)
                    if exs:
                        sources_used.append(str(mf.relative_to(Path.home())))
                except Exception as e:
                    print(f"  Warning: failed on {mf.name}: {e}", file=sys.stderr)
        else:
            print(f"Blog dir not found: {blog_dir} (you can pass --blog-dir)")

        # Also pick up any extra .md you manually dropped into gold-sources/
        extra_mds = sorted((root / "gold-sources").glob("*.md"))
        if extra_mds:
            print(f"Found {len(extra_mds)} extra .md in gold-sources/")
            for mf in extra_mds:
                try:
                    exs = build_blog_messages(mf)
                    all_examples.extend(exs)
                    if exs:
                        sources_used.append(f"gold-sources/{mf.name}")
                except Exception as e:
                    print(f"  Warning on extra md {mf.name}: {e}", file=sys.stderr)

    # Dedup + cap
    seen = set()
    deduped = []
    for ex in all_examples:
        key = json.dumps(ex, sort_keys=True)
        if key not in seen:
            seen.add(key)
            deduped.append(ex)
    deduped = deduped[: args.max_examples]

    print(f"\nTotal examples after dedup + cap: {len(deduped)}")

    if args.dry_run:
        print("\n=== DRY RUN — first 2 examples ===\n")
        for i, ex in enumerate(deduped[:2]):
            print(f"--- Example {i+1} ---")
            for msg in ex["messages"]:
                role = msg["role"].upper()
                content = msg["content"][:280].replace("\n", " ")
                print(f"{role}: {content}...")
            print()
        print("Run without --dry-run to write the files.")
        return

    # Write outputs
    out_path = root / args.output
    info_path = root / args.info

    with out_path.open("w", encoding="utf-8") as f:
        for ex in deduped:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    info = {
        "created_at": datetime.utcnow().isoformat() + "Z",
        "total_examples": len(deduped),
        "sources": sorted(set(sources_used)),
        "format": "openai-chat-messages",
        "notes": "Matches the messages shape produced by server/pipeline/training-capture.ts for Vertex fine-tunes. "
                 "Use with train.py (Unsloth SFT on Qwen2.5-Instruct).",
    }
    with info_path.open("w", encoding="utf-8") as f:
        json.dump(info, f, indent=2)

    print(f"\nWrote {len(deduped)} examples → {out_path}")
    print(f"Wrote info → {info_path}")
    print("\nNext: activate your unsloth venv, then run:")
    print("  python train.py --dataset dataset.jsonl --max-steps 80 --model 7b")
    print("  (or --model 3b if you have <10 GB VRAM)")


if __name__ == "__main__":
    main()