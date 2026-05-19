#!/bin/bash
# Install Railway CLI for deploying and maintaining production apps.
#
# Usage: ./scripts/install-railway-cli.sh
#
# After install:
#   railway login        # one-time browser auth
#   railway link         # link the local repo to the Railway project
#   railway status       # show service / environment
#   railway up           # deploy
#   railway logs         # tail production logs
#
# See railway.toml for the multi-service deployment model
# (ttml-app / worker / migrate via PROCESS_TYPE).

set -e

PKG="@railway/cli"

if command -v railway >/dev/null 2>&1; then
  echo "✅ railway already installed: $(railway --version)"
  exit 0
fi

echo "Installing Railway CLI ($PKG)..."

if command -v npm >/dev/null 2>&1; then
  npm install -g "$PKG"
elif command -v pnpm >/dev/null 2>&1; then
  pnpm add -g "$PKG"
elif command -v brew >/dev/null 2>&1; then
  brew install railway
else
  echo "❌ Need npm, pnpm, or brew on PATH to install Railway CLI." >&2
  echo "   See https://docs.railway.com/guides/cli for manual install options." >&2
  exit 1
fi

echo "✅ Installed: $(railway --version)"
echo
echo "Next: run 'railway login' to authenticate."
