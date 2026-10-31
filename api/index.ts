/**
 * Vercel function entry — serves every /api/* request (and /health, /sitemap.xml)
 * through the shared Express app. The static client is served by Vercel's CDN;
 * see vercel.json for the rewrites that route here.
 */
// Sentry must be initialised first. Long-running deployments load this via
// `node --import`; a Vercel function has no such hook, so import it explicitly.
import "../server/instrument";
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { initServerSentry } from "../server/sentry";
initServerSentry();

import { createApp } from "../server/_core/app";

export default createApp();
