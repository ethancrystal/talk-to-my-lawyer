#!/usr/bin/env bash
# Vercel build: static client + (production only) database migrations.
#
# The Express API is NOT built here — Vercel compiles api/index.ts itself.
# Migrations used to run in the Railway `migrate` service; on Vercel they run
# once per PRODUCTION build so preview deployments never touch the prod DB.
set -euo pipefail

pnpm exec vite build

if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "[build] Production build — applying database migrations"
  pnpm run -s _build:migrate
  node --dns-result-order=ipv4first dist/migrate.js
else
  echo "[build] VERCEL_ENV=${VERCEL_ENV:-unset} — skipping database migrations"
fi
