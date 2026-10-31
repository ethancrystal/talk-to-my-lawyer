// Vercel function: serves /api/*, /health* and /sitemap.xml through the shared
// Express app. server/vercel-bundle.mjs is generated at build time by
// scripts/vercel-build.sh from server/vercel-entry.ts — see that file for why
// the server is pre-bundled.
export { default } from "../server/vercel-bundle.mjs";
