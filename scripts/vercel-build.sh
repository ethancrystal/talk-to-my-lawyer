#!/usr/bin/env bash
# Vercel build (see vercel.json → buildCommand).
#
#   1. vite build             → dist/public (served by Vercel's CDN)
#   2. esbuild server bundle  → server/vercel-bundle.mjs (re-exported by api/index.js)
#
# Database migrations are NOT run here: preview builds must never touch the
# production database. Apply migrations deliberately with `pnpm db:migrate`.
set -euo pipefail

pnpm exec vite build

pnpm exec esbuild server/vercel-entry.ts \
  --platform=node --packages=external --bundle --format=esm \
  --outfile=server/vercel-bundle.mjs \
  --define:process.env.NODE_ENV='"production"' \
  --external:@tailwindcss/vite --external:@vitejs/plugin-react --external:vite

# The prompt loader looks for its markdown next to the running module first
# (server/ for the bundle), so ship a copy there. includeFiles in vercel.json
# does not reliably accept multiple globs.
cp server/pipeline/prompts/*.md server/
