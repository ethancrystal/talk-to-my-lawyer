#!/usr/bin/env python3
"""
TTML Qwen Unsloth Fine-Tuner

Cleaned, configurable version of the Unsloth fine-tuning recipe you provided.

Key upgrades over the raw paste:
- Proper imports and formatting.
- Uses the model's native chat template (apply_chat_template) instead of a custom Alpaca string.
  This works much better for Qwen2.5-Instruct.
- Full argparse for model size (7B/3B), steps, LoRA rank, batch/accumulation, output dir, etc.
- Same Unsloth 4-bit QLoRA settings from the original guide.
- Auto bf16/fp16 detection.
- Exports directly to GGUF q4_k_m ready for Ollama (or LM Studio).
- Prints clear next-step commands at the end.

Run on a machine with a real NVIDIA GPU (see README).

Example:
    python train.py --dataset dataset.jsonl --max-steps 80 --model 7b --output-dir outputs
    python train.py --dataset dataset.jsonl --max-steps 40 --model 3b --r 8
"""

import argparse
import os
from pathlib import Path

import torch
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

# Unsloth must be imported after the above in many environments
from unsloth import FastLanguageModel


def parse_args():
    p = argparse.ArgumentParser(description="Fine-tune Qwen2.5 with Unsloth on TTML gold data")
    p.add_argument("--dataset", default="dataset.jsonl", help="Path to chat-format JSONL (messages array)")
    p.add_argument("--model", choices=["7b", "3b"], default="7b", help="Base model size")
    p.add_argument("--max-steps", type=int, default=80, help="Training steps (60-120 is often plenty for small gold sets)")
    p.add_argument("--output-dir", default="outputs", help="Where to save the GGUF and intermediates")
    p.add_argument("--r", type=int, default=16, help="LoRA rank")
    p.add_argument("--lora-alpha", type=int, default=16, help="LoRA alpha")
    p.add_argument("--per-device-batch-size", type=int, default=2)
    p.add_argument("--gradient-accumulation-steps", type=int, default=4)
    p.add_argument("--learning-rate", type=float, default=2e-4)
    p.add_argument("--warmup-steps", type=int, default=5)
    p.add_argument("--max-seq-length", type=int, default=2048)
    p.add_argument("--quantization-method", default="q4_k_m", help="GGUF quant for export")
    p.add_argument("--seed", type=int, default=3407)
    return p.parse_args()


def main():
    args = parse_args()

    model_name = {
        "7b": "unsloth/Qwen2.5-7B-Instruct-bnb-4bit",
        "3b": "unsloth/Qwen2.5-3B-Instruct-bnb-4bit",
    }[args.model]

    print(f"Loading base model: {model_name}")
    print(f"Target max steps: {args.max_steps}")
    print(f"LoRA r={args.r}, alpha={args.lora_alpha}")

    max_seq_length = args.max_seq_length
    dtype = None  # auto
    load_in_4bit = True

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_name,
        max_seq_length=max_seq_length,
        dtype=dtype,
        load_in_4bit=load_in_4bit,
    )

    # LoRA (same targets as the original recipe you pasted)
    model = FastLanguageModel.get_peft_model(
        model,
        r=args.r,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_alpha=args.lora_alpha,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=args.seed,
    )

    # Load dataset — expects JSONL with a "messages" key (list of {role, content})
    print(f"Loading dataset from {args.dataset}")
    dataset = load_dataset("json", data_files=args.dataset, split="train")

    # Format using the model's own chat template (critical for good Instruct tuning)
    def format_prompts(batch):
        texts = []
        for messages in batch["messages"]:
            # apply_chat_template with tokenize=False gives the exact text the model saw in pre-training
            text = tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=False,
            )
            texts.append(text)
        return {"text": texts}

    dataset = dataset.map(format_prompts, batched=True)

    # Training args (close to the original paste, with sensible modern defaults)
    training_args = TrainingArguments(
        per_device_train_batch_size=args.per_device_batch_size,
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        warmup_steps=args.warmup_steps,
        max_steps=args.max_steps,
        learning_rate=args.learning_rate,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=1,
        output_dir=args.output_dir,
        optim="adamw_8bit",
        seed=args.seed,
        report_to="none",  # change to "wandb" if you want tracking
    )

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=max_seq_length,
        dataset_num_proc=2,
        packing=False,
        args=training_args,
    )

    print("Starting training...")
    trainer_stats = trainer.train()
    print("Training complete.")
    print(trainer_stats)

    # Export to GGUF (the whole point for Ollama / LM Studio)
    out_path = Path(args.output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    gguf_dir = out_path / "gguf"
    gguf_dir.mkdir(exist_ok=True)

    print(f"Exporting GGUF ({args.quantization_method}) to {gguf_dir} ...")
    model.save_pretrained_gguf(
        str(gguf_dir),
        tokenizer,
        quantization_method=args.quantization_method,
    )

    gguf_file = list(gguf_dir.glob("*.gguf"))[0] if list(gguf_dir.glob("*.gguf")) else gguf_dir

    print("\n" + "=" * 60)
    print("SUCCESS — Model exported")
    print("=" * 60)
    print(f"GGUF file: {gguf_file}")
    print()
    print("To load into Ollama (recommended):")
    print(f"  echo 'FROM {gguf_file}' > Modelfile")
    print(f"  ollama create ttml-qwen-{args.model}-v1 -f Modelfile")
    print(f"  ollama run ttml-qwen-{args.model}-v1")
    print()
    print("You can also drop the GGUF directly into LM Studio.")
    print("The fine-tune has now permanently updated the model's behavior on TTML-style tasks.")
    print("=" * 60)


if __name__ == "__main__":
    main()