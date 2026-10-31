/**
 * Vercel function entry — the shared Express app (server/_core/appFactory.ts)
 * as a request handler.
 *
 * This file is NOT deployed as-is. scripts/vercel-build.sh bundles it with
 * esbuild into server/vercel-bundle.mjs, which api/index.js re-exports. The
 * bundle step is required: package.json is `"type": "module"` and the server
 * uses extensionless relative imports, which Vercel's per-file TypeScript
 * compile cannot resolve at runtime (ERR_MODULE_NOT_FOUND).
 *
 * The bundle lives in server/ on purpose: code that resolves files relative to
 * its own module (letterTemplates.ts → ../attached_assets) keeps working.
 *
 * Static client files are served by Vercel's CDN from dist/public; vercel.json
 * rewrites only /api/*, /health* and /sitemap.xml here.
 */

// NODE_ENV is pinned to "production" at bundle time (esbuild --define in
// scripts/vercel-build.sh) so the Vite dev server can never start here.

import type { Request, Response } from "express";
import { createApp } from "./_core/appFactory";

// createApp is async; build it once per function instance and reuse it.
const appPromise = createApp({ vercel: true, validateEnv: false }).then(r => r.app);

export default async function handler(req: Request, res: Response) {
  const app = await appPromise;
  return app(req, res);
}
