# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Self-hosted GitHub Actions runner for moizj00/ttml-app.
#
# Lets .github/workflows/ci.yml run on your own hardware — self-hosted runner
# minutes are NOT billed, so this works even when GitHub-hosted runners are
# unavailable (account blocked / out of included minutes).
#
# Build + run via docker-compose.runner.yml (see docs/SELF_HOSTED_RUNNER.md).
#
# ⚠️  SECURITY: this repo is PUBLIC. Only ever run trusted code on a self-hosted
#     runner. .github/workflows/ci.yml is guarded so fork pull requests are
#     skipped on the self-hosted runner — keep that guard in place.
# ─────────────────────────────────────────────────────────────────────────────
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Base tooling:
#  • git/curl/ca-certificates → actions/checkout + actions/setup-node downloads
#  • build-essential/python3   → native module compiles during `pnpm install`
#  • jq                        → entrypoint token exchange
#  • the runner's own runtime deps are added by installdependencies.sh below
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git tar gzip jq sudo unzip \
      build-essential python3 \
    && rm -rf /var/lib/apt/lists/*

# GitHub requires the runner NOT run as root.
RUN useradd -m -s /bin/bash runner
WORKDIR /home/runner

# Download the runner. RUNNER_VERSION="" (default) resolves the latest release
# so a stale pin can never 404 the build; override to pin a specific version.
ARG RUNNER_VERSION=""
ARG RUNNER_ARCH=x64
RUN set -eux; \
    ver="${RUNNER_VERSION}"; \
    if [ -z "$ver" ]; then \
      ver="$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest \
             | jq -r .tag_name | sed 's/^v//')"; \
    fi; \
    curl -fsSL -o runner.tar.gz \
      "https://github.com/actions/runner/releases/download/v${ver}/actions-runner-linux-${RUNNER_ARCH}-${ver}.tar.gz"; \
    tar xzf runner.tar.gz; \
    rm runner.tar.gz; \
    ./bin/installdependencies.sh; \
    chown -R runner:runner /home/runner

COPY --chmod=0755 entrypoint.sh /home/runner/entrypoint.sh

USER runner
ENTRYPOINT ["/home/runner/entrypoint.sh"]
