import json
import os
from datetime import datetime
from pathlib import Path


def _canonical_root() -> Path:
    """Repo root, preferring the canonical tesla_laptops checkout (overridable
    via TTML_REPO_ROOT) so outputs never land under another profile."""
    env = os.environ.get("TTML_REPO_ROOT", "").strip()
    if env and Path(env).is_dir():
        return Path(env)
    canonical = Path(r"C:\home\tesla_laptops\ttml-app-work")
    if canonical.is_dir():
        return canonical
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        if (parent / ".git").exists():
            return parent
    return here.parent.parent


_root = _canonical_root()
scripts_dir = _root / 'scripts'
claude_dir = _root / '.claude'

# Read harvest_out.txt (may have Windows-1252 chars) and strip the 4 progress lines
harvest_txt = scripts_dir / 'harvest_out.txt'
raw = harvest_txt.read_text(encoding='utf-8', errors='replace')
json_lines = [l for l in raw.splitlines()
              if not l.startswith('[1/') and not l.startswith('[2/')
              and not l.startswith('[3/') and not l.startswith('[4/')]
data = json.loads('\n'.join(json_lines))

# Restore the raw JSON file
out_json = claude_dir / 'harvested-raw-2026-06-02.json'
out_json.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
print(f"Restored {data['total']} questions to {out_json.name}")

# Create daily-titles-YYYY-MM-DD.md for sync-titles-to-master.py
today = datetime.now().strftime('%Y-%m-%d')
daily_file = claude_dir / f'daily-titles-{today}.md'
by = data['by_source']
out_lines = [
    f"harvested_at: {data['harvested_at']}",
    f"total_harvested: {data['total']}",
    f"by_source: reddit={by['reddit']} alsoasked={by['alsoasked']} findquestions={by['findquestions']} google_news={by['google_news']}",
    ''
]
for i, q in enumerate(data['questions'], 1):
    out_lines.append(f"{i}. {q['title']}")
daily_file.write_text('\n'.join(out_lines) + '\n', encoding='utf-8')
print(f"Created {daily_file.name} with {len(data['questions'])} titles")
