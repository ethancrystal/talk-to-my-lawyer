#!/usr/bin/env bash
# Register this self-hosted runner with the repo, run it, and deregister on exit.
# See docs/SELF_HOSTED_RUNNER.md for setup.
set -euo pipefail

: "${REPO_URL:?Set REPO_URL, e.g. https://github.com/moizj00/ttml-app}"
RUNNER_NAME="${RUNNER_NAME:-ttml-$(hostname)}"
RUNNER_LABELS="${RUNNER_LABELS:-self-hosted,linux,x64}"
RUNNER_WORKDIR="${RUNNER_WORKDIR:-_work}"

# owner/repo slug from REPO_URL (strip scheme + optional .git suffix).
slug="${REPO_URL#http*://github.com/}"
slug="${slug%.git}"

# Fetch a short-lived token from the GitHub API. $1 = registration | remove.
# Requires GH_PAT (classic: `repo` scope, or fine-grained: Administration RW).
api_token() {
  : "${GH_PAT:?Set GH_PAT (repo-scoped PAT) or RUNNER_TOKEN}"
  curl -fsSL -X POST \
    -H "Authorization: Bearer ${GH_PAT}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${slug}/actions/runners/${1}-token" \
    | jq -r '.token'
}

registration_token() {
  if [ -n "${RUNNER_TOKEN:-}" ]; then
    printf '%s' "${RUNNER_TOKEN}"
  else
    api_token registration
  fi
}

# Cleanly deregister on container stop so GitHub doesn't accumulate dead runners.
cleanup() {
  echo "[runner] Caught stop signal — deregistering…"
  if [ -n "${GH_PAT:-}" ]; then
    ./config.sh remove --token "$(api_token remove)" || true
  elif [ -n "${RUNNER_TOKEN:-}" ]; then
    ./config.sh remove --token "${RUNNER_TOKEN}" || true
  fi
  exit 0
}
trap cleanup INT TERM

EPHEMERAL=""
[ "${RUNNER_EPHEMERAL:-false}" = "true" ] && EPHEMERAL="--ephemeral"

echo "[runner] Registering '${RUNNER_NAME}' for ${slug} (labels: ${RUNNER_LABELS})…"
./config.sh \
  --unattended \
  --replace \
  --url "${REPO_URL}" \
  --token "$(registration_token)" \
  --name "${RUNNER_NAME}" \
  --labels "${RUNNER_LABELS}" \
  --work "${RUNNER_WORKDIR}" \
  ${EPHEMERAL}

echo "[runner] Listening for jobs…"
# Background + wait so the SIGTERM/SIGINT trap can fire for clean deregistration.
./run.sh &
wait $!
