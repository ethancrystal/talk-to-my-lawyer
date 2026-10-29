# TTML Local Qwen Fine-Tune (Unsloth)

**Goal:** Permanently bake your "gold standard" TTML voice (approved attorney letters + your best blog writing) into a local Qwen2.5 model so that `ollama run ttml-qwen-7b` or your local attorney agent produces first drafts that already sound like Talk to My Lawyer — concrete California statutes, the "other side priced your silence" opening, exact dollar amounts + deadlines, tight steps, the attorney-reviewed stamp energy, no generic AI tells.

This is the local / on-prem complement to the cloud Vertex AI fine-tuning loop that already exists in the app (the one that captures real approved letters after attorney review).

You pasted the original Unsloth recipe. This package is that recipe, made real for your actual content and repo.

---

## ⚠️ Critical: Where you can actually run the training

**Unsloth training requires a real NVIDIA GPU with CUDA** (RTX 3060 12 GB, 4060/4070 8-12 GB+, A6000, 4090, etc.).

In **this current shell** the environment check shows:

- No `nvidia-smi`
- No `/dev/nvidia*` devices
- Only Microsoft Basic Render Driver (software fallback)

You are inside a dev container, Codespace, or WSL instance without GPU passthrough.

**What to do:**

1. **Best option** — On the Windows machine that actually has the RTX card:
   - Install/confirm NVIDIA drivers + CUDA 12.4+ on Windows
   - Enable GPU support in WSL2 (see NVIDIA WSL user guide)
   - Copy or `git worktree` this `llm/finetune-qwen-unsloth/` folder into a WSL distro that sees the GPU
   - Run the steps below there

2. Google Colab (Pro/Pro+ strongly recommended) — Unsloth has first-class Colab support. Upload `dataset.jsonl` and run a notebook version of `train.py`.

3. RunPod / Vast.ai / Lambda one-click Unsloth templates (cheap 4090 or A6000 pods are perfect for 7B QLoRA).

After training you only need the resulting `.gguf` file + the `Modelfile`. You can `ollama create` it on **any** machine that has Ollama (including this one, or your LM Studio Windows setup).

You **can** run `prepare_gold_dataset.py` and `check_environment.py` on CPU-only machines. Training (`train.py`) is the GPU step.

---

## Quick Start (on a real GPU machine)

```bash
# 1. Go to the package
cd llm/finetune-qwen-unsloth

# 2. Check your actual hardware
python check_environment.py
# (or nvidia-smi directly)

# 3. (Optional but recommended) Create a clean venv
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 4. Install Unsloth (exact command from the recipe you pasted)
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
pip install trl transformers accelerate datasets

# 5. Build (or rebuild) the dataset from your gold
# This already produced a good dataset.jsonl in the repo.
# Re-run if you added more posts to TTML-Blog or new approved letters.
python prepare_gold_dataset.py --max-examples 40 --output dataset.jsonl

# 6. Train (start small, then scale)
# On 12 GB cards you can usually do the 7B. On 8 GB cards start with --model 3b
python train.py \
  --dataset dataset.jsonl \
  --max-steps 80 \
  --model 7b \
  --output-dir outputs

# 7. Import into Ollama (the GGUF was written by save_pretrained_gguf)
# The script prints the exact path. Typical result:
#   model_output/unsloth.Q4_K_M.gguf
echo 'FROM ./outputs/unsloth.Q4_K_M.gguf' > Modelfile
ollama create ttml-qwen-7b-v1 -f Modelfile

# 8. Talk to your permanently updated local model
ollama run ttml-qwen-7b-v1 "Write a demand letter for a California tenant whose landlord refused to return a $2,850 security deposit after the tenant provided photos and a move-out video showing the unit was left clean."
```

---

## What "gold standard" is being used right now

The `prepare_gold_dataset.py` pulls from:

- **Letter templates** (`gold-sources/Template-*-Approved-Letter*.html` and the draft variants)
  - These are the actual approved letterhead designs + the professional tone + the blue "ATTORNEY REVIEWED & APPROVED" stamp block that real attorneys sign off on.

- **TTML-Blog posts** (default: `~/Obsidian/root/TTML-Blog/`)
  - Your best long-form explanatory writing: statute citations, concrete numbers, "the landlord/contractor priced your silence" framing, step-by-step tables, strong closers.
  - The curation note you already wrote (`fine-tune-ttml-gold-curation.md`) describes exactly the signals we want the model to internalize.

You can point the preparer at more folders:

```bash
python prepare_gold_dataset.py --blog-dir /path/to/even-better-drafts --max-examples 60
```

It outputs standard OpenAI chat `messages` JSONL — the exact same shape your production `training-capture.ts` uses for the Vertex AI cloud fine-tunes. This makes it trivial later to mix real consented production letters (after attorney approval) with these hand-curated gold examples.

---

## Files in this package

- `check_environment.py` — the pre-flight you just ran. Run it first on any new machine.
- `prepare_gold_dataset.py` — turns your real blogs + letter templates into training data.
- `train.py` — the cleaned, configurable, production-grade version of the script you pasted (proper chat template, argparse, good defaults, GGUF export).
- `gold-sources/` — self-contained copies of the strongest letter templates + a few representative blog posts (so the package is portable).
- `dataset.jsonl` + `dataset_info.json` — generated by the prepare step (committed examples are small and useful for smoke tests).
- `Modelfile` — example for `ollama create`.
- `.gitignore` — ignores big model outputs, venvs, etc.

---

## The train.py script (what changed from the raw paste)

- Fixed the mangled imports / newlines that were in the original paste.
- Uses the model's native Qwen2.5 chat template (`tokenizer.apply_chat_template`) instead of a hand-rolled Alpaca string. Much better for an Instruct model.
- Full CLI: `--model 7b|3b`, `--max-steps`, `--r` (LoRA rank), batch/grad-accum, output dir, quantization method.
- Same Unsloth 4-bit + LoRA settings you had (targets q/k/v/o/gate/up/down, gradient checkpointing "unsloth", etc.).
- After training it calls `save_pretrained_gguf(..., "q4_k_m")` exactly as in the recipe.
- Prints the exact next commands for `ollama create`.

You can still increase `--max-steps` to 150-300 once you have 30-50+ high-quality examples.

---

## After you have the fine-tuned model

- Use it in any local Python script that talks to Ollama (see the `local-llm-attorney-platform` skill's `attorney_agent_starter.py` patterns).
- You can keep using LM Studio on Windows for the GGUF if you prefer — just point it at the new file, or import via Ollama and use the OpenAI-compatible endpoint.
- The model is now a **permanent style update**. Future improvements come from:
  - Adding more gold posts / newly approved letters to the dataset and re-running
  - Later, exporting real consented training examples from your production `training_log` table (same shape) and mixing them in.

---

## Recommended model sizes & hardware (from the original guide + real experience)

- **7B** (`unsloth/Qwen2.5-7B-Instruct-bnb-4bit`): best quality. Needs ~10-12 GB+ VRAM comfortable during training with the settings in this package.
- **3B** (`unsloth/Qwen2.5-3B-Instruct-bnb-4bit`): very usable fallback on 8 GB cards. Still dramatically better than base for TTML voice once fine-tuned on your gold.

Start with `--max-steps 60` on a small dataset. Over-fitting is not a bug here — you *want* it to strongly internalize the TTML patterns from the limited gold you have.

---

## Common issues & fixes

- `nvidia-smi` missing or "CUDA not available" after install → you are not on a GPU-enabled WSL / the drivers inside the container are wrong. Reboot the WSL distro after enabling GPU on the Windows side, or use a proper cloud pod.
- Python 3.14 in this environment → many people hit friction. On your real training box prefer 3.11 or 3.12 via pyenv / deadsnakes if the pip install blows up.
- Out of memory on 7B → drop to `--model 3b`, or lower `per_device_train_batch_size` to 1 and raise `gradient_accumulation_steps`.
- Want to continue from a previous run → Unsloth + PEFT makes it straightforward; the script can be extended with `model = PeftModel.from_pretrained(...)`.

---

## Next-level (after the first successful run)

- Add a small `export_from_db.py` that pulls consented approved letters from your local Postgres (respecting the same `consentToTraining` flag the cloud path uses) and appends them to the dataset.
- Wire the new `ttml-qwen-7b-v1` model into a local version of the attorney review agent or a private draft generator.
- Track which gold examples were used for each versioned model (the `dataset_info.json` + git history already gives you most of this).

---

## References inside the bigger TTML world

- Production fine-tune capture: `server/pipeline/training-capture.ts` (the `buildTrainingExample` function defines the messages shape we reuse here).
- Cloud fine-tune orchestration: `server/pipeline/fine-tune.ts` + worker polling.
- Local LLM philosophy + guardrails + starter agent code: the `local-llm-attorney-platform` skill.
- Your own voice signals: `~/Documents/Foundation/voice-fingerprint.md` and the curation note you wrote in Obsidian.

This package exists so the next time someone says "make the local model sound like us," you have a repeatable, versioned, gold-source-driven process instead of one-off prompt hacking.

Run it on real hardware, get your first `ttml-qwen` model into Ollama, then tell the rest of the team the local brain has been updated.