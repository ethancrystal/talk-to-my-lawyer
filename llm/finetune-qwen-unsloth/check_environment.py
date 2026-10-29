#!/usr/bin/env python3
"""
TTML Qwen Unsloth Fine-Tune — Environment Pre-Flight Check

Run this BEFORE creating the venv or installing anything.

It will tell you:
- Whether you have a real NVIDIA GPU with CUDA (required for Unsloth)
- Python / PyTorch / CUDA compatibility
- VRAM available (critical for 7B vs 3B model choice)
- Ollama presence
- Clear guidance on what to do if this machine cannot train.

Usage:
    python check_environment.py
"""

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

def run_cmd(cmd: list[str], timeout: int = 8) -> str:
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True, timeout=timeout)
        return out.strip()
    except Exception as e:
        return f"(error: {e})"

def check_nvidia_smi() -> dict:
    result = {"present": False, "output": ""}
    if shutil.which("nvidia-smi"):
        result["present"] = True
        result["output"] = run_cmd(["nvidia-smi", "--query-gpu=name,driver_version,memory.total,memory.free", "--format=csv,noheader"])
    else:
        result["output"] = "nvidia-smi not found in PATH"
    return result

def check_dev_nvidia() -> list[str]:
    devices = []
    for p in Path("/dev").glob("nvidia*"):
        devices.append(str(p))
    return devices

def check_torch() -> dict:
    info = {"installed": False, "version": None, "cuda_available": False, "gpu_name": None, "vram_gb": None, "torch_cuda_version": None}
    try:
        import torch
        info["installed"] = True
        info["version"] = torch.__version__
        info["cuda_available"] = torch.cuda.is_available()
        if info["cuda_available"]:
            info["gpu_name"] = torch.cuda.get_device_name(0)
            props = torch.cuda.get_device_properties(0)
            info["vram_gb"] = round(props.total_memory / (1024 ** 3), 1)
            info["torch_cuda_version"] = torch.version.cuda
    except ImportError:
        pass
    except Exception as e:
        info["error"] = str(e)
    return info

def check_ollama() -> dict:
    info = {"present": False, "version": ""}
    if shutil.which("ollama"):
        info["present"] = True
        info["version"] = run_cmd(["ollama", "--version"])
    return info

def check_python() -> dict:
    return {
        "version": platform.python_version(),
        "executable": sys.executable,
        "is_3_14": platform.python_version().startswith("3.14"),
    }

def main():
    print("=" * 70)
    print("TTML Qwen Unsloth Fine-Tune — Environment Check")
    print("=" * 70)
    print()

    py = check_python()
    print(f"Python: {py['version']}  ({py['executable']})")
    if py["is_3_14"]:
        print("  ⚠️  WARNING: Python 3.14 is very new. Most ML packages (including Unsloth/TRL)")
        print("      target 3.10–3.12. You may hit compatibility issues. Consider using")
        print("      pyenv or deadsnakes to install Python 3.11 or 3.12 for the venv.")
    print()

    nv = check_nvidia_smi()
    print("NVIDIA GPU (nvidia-smi):")
    if nv["present"]:
        print(f"  ✓ Found: {nv['output']}")
    else:
        print(f"  ✗ {nv['output']}")
    print()

    devs = check_dev_nvidia()
    print(f"/dev/nvidia* nodes: {devs if devs else 'NONE FOUND'}")
    if not devs:
        print("  (This is expected in containers / WSL without GPU passthrough)")
    print()

    torch = check_torch()
    print("PyTorch / CUDA (via torch):")
    if torch["installed"]:
        print(f"  PyTorch: {torch['version']}")
        if torch["cuda_available"]:
            print(f"  ✓ CUDA available")
            print(f"    GPU: {torch['gpu_name']}")
            print(f"    VRAM: {torch['vram_gb']} GB")
            print(f"    torch CUDA build: {torch['torch_cuda_version']}")
        else:
            print("  ✗ torch says CUDA is NOT available")
            if "error" in torch:
                print(f"     error: {torch['error']}")
    else:
        print("  PyTorch is NOT installed (this is normal before you run the setup steps).")
    print()

    oll = check_ollama()
    print("Ollama:")
    if oll["present"]:
        print(f"  ✓ ollama found — {oll['version']}")
    else:
        print("  ✗ ollama not found in PATH (you said you have it — make sure it's in PATH in this shell)")
    print()

    # Final verdict
    print("=" * 70)
    print("VERDICT FOR UNSLOTH TRAINING")
    print("=" * 70)

    has_real_gpu = nv["present"] and bool(devs) and torch.get("cuda_available", False)

    if has_real_gpu:
        vram = torch.get("vram_gb", 0) or 0
        print("✓ Looks like you have a real NVIDIA GPU with CUDA.")
        print(f"  Detected VRAM: {vram} GB")
        if vram >= 10:
            print("  Recommendation: You can try the 7B model (unsloth/Qwen2.5-7B-Instruct-bnb-4bit).")
        elif vram >= 7:
            print("  Recommendation: Use the 3B model (unsloth/Qwen2.5-3B-Instruct-bnb-4bit) or very aggressive 4-bit + low batch.")
        else:
            print("  ⚠️  Very low VRAM. Training will likely be painful or impossible. Consider cloud/Colab.")
        print()
        print("Next steps on this machine:")
        print("  1. python -m venv .venv")
        print("  2. source .venv/bin/activate")
        print('  3. pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"')
        print("  4. pip install trl transformers accelerate datasets")
        print("  5. python prepare_gold_dataset.py")
        print("  6. python train.py --max-steps 60 --model 7b   # or 3b")
    else:
        print("✗ NO SUITABLE NVIDIA GPU DETECTED IN THIS ENVIRONMENT")
        print()
        print("Unsloth fine-tuning (the script you pasted) **requires** a real NVIDIA GPU")
        print("with CUDA support (RTX 3060 12GB, 4060/4070 8-12GB+, or better).")
        print()
        print("Current environment diagnosis:")
        print("  - nvidia-smi not present")
        print("  - No /dev/nvidia* device nodes")
        print("  - Only Microsoft Basic Render Driver visible (software fallback)")
        print()
        print("What this means:")
        print("  You are almost certainly inside:")
        print("    • A dev container / .devcontainer without GPU")
        print("    • WSL2 without NVIDIA GPU passthrough enabled on the Windows host")
        print("    • A cloud VM / Codespace / remote shell that has no discrete GPU")
        print()
        print("RECOMMENDED PATHS TO ACTUALLY RUN THE TRAINING:")
        print()
        print("Option A (best, what most people do):")
        print("  - On your Windows desktop/laptop that has the RTX card:")
        print("    1. Make sure NVIDIA drivers + CUDA 12.4+ are installed on Windows")
        print("    2. Enable GPU in WSL2 (https://docs.nvidia.com/cuda/wsl-user-guide/index.html)")
        print("    3. Inside the WSL distro that has GPU access, clone or copy this")
        print("       llm/finetune-qwen-unsloth/ folder")
        print("    4. Run the check + setup there")
        print()
        print("Option B:")
        print("  - Use Google Colab (Pro or Pro+ recommended) — Unsloth has excellent")
        print("    Colab notebooks. Upload your dataset.jsonl and run a similar script.")
        print()
        print("Option C:")
        print("  - RunPod / Vast.ai / Lambda Labs one-click template with Unsloth pre-installed.")
        print("    Cheap A6000 / 4090 pods work great for this size of fine-tune.")
        print()
        print("After you train on a real GPU machine, you only need to copy the resulting")
        print("GGUF file + Modelfile back to any machine that has Ollama (including this one)")
        print("and run `ollama create ttml-qwen-7b-v1 -f Modelfile`.")
        print()
        print("You can still run the prepare_gold_dataset.py step here (it is CPU-only).")
        print("Just don't try to execute train.py until you are on a machine with CUDA.")

    print()
    print("=" * 70)
    print("Also check your Obsidian + ttml-app paths for gold data (they are used by prepare_gold_dataset.py).")
    print("Default locations this script will look for:")
    print("  Blogs:     ~/Obsidian/root/blog/   (or pass --blog-dir)")
    print("  Letters:   ./gold-sources/         (we already copied the 4 approved/draft templates)")
    print("=" * 70)

if __name__ == "__main__":
    main()