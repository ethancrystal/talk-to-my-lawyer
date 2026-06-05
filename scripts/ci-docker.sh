#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Run the project's CI gate inside Docker — a drop-in for the GitHub Actions
# `build-and-test` job that consumes zero GitHub runner minutes.
#
#   scripts/ci-docker.sh                 # full gate: check + test + build
#   scripts/ci-docker.sh check           # tsc --noEmit only
#   scripts/ci-docker.sh test            # vitest run only
#   scripts/ci-docker.sh build           # vite + esbuild only
#
# Lockfile drift escape hatch (matches the prod Dockerfile's behaviour):
#   PNPM_INSTALL_FLAGS=--no-frozen-lockfile scripts/ci-docker.sh
#
# Exit code is the gate's exit code: 0 = green, non-zero = red.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

TARGET="${1:-revalidate}"
INSTALL_FLAGS="${PNPM_INSTALL_FLAGS:---frozen-lockfile}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "${TARGET}" in
  check|test|build|revalidate) ;;
  *)
    echo "Unknown target '${TARGET}'. Use one of: check | test | build | revalidate" >&2
    exit 2
    ;;
esac

echo "▶ Running CI gate '${TARGET}' in Docker (install flags: ${INSTALL_FLAGS})…"

DOCKER_BUILDKIT=1 docker build \
  -f "${REPO_ROOT}/Dockerfile.ci" \
  --target "${TARGET}" \
  --build-arg "PNPM_INSTALL_FLAGS=${INSTALL_FLAGS}" \
  --progress=plain \
  "${REPO_ROOT}"

echo "✅ CI gate '${TARGET}' passed."
