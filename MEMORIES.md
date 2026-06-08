# TTML App - Persistent Agent Memory

**This is the canonical persistent memory file for the ttml-work-app / ttml-app project.**

**Instructions for any new agent or session:**
- ALWAYS read this entire file at the start of a session when the working directory is (or contains) ttml-work-app or ttml-app.
- This file lives in the root of the local clone.
- To keep in sync across machines/agents: copy this file or pull the latest from the repo (it is committed).
- Recent work is summarized below. Use `git log` and GitHub for full details.
- The local folder `ttml-work-app` (at C:\Users\Tesla Laptops\ttml-work-app) is the primary working copy synced to the GitHub repository **moizj00/ttml-app**.

**Repository:**
- GitHub: https://github.com/moizj00/ttml-app (private)
- Local primary: ttml-work-app (this directory)
- Remote origin: https://github.com/moizj00/ttml-app

---

## Recent Activity & Commits (as of 2026-06-08)

The project is actively maintained with frequent commits focused on:
- Daily blog post publishing (TTML content strategy)
- Pipeline reliability (LangGraph, checkpointer, progress UI)
- Auth improvements (single-click login, Terms modal)
- Dependency upgrades and security fixes (Node 24, LangChain CVE, lucide-react)
- Dep updates and chore work

### Latest Commits from GitHub (moizj00/ttml-app, main branch):

1. **e77aa7b** (2026-06-08) - chore: update published-topics for 2026-06-07
2. **198ccfd** (2026-06-08) - blog: add 10 posts for 2026-06-07
3. **9aa12f6** (2026-06-08) - chore(deps): bump @langchain/core 1.1.41 → 1.1.48 (CVE-2025-68664)
   - Patches serialization injection CVE. Full audit report in docs/DEPENDABOT_AUDIT_RUN_29_2026-06-08.md
4. **89b155f** (2026-06-08) - Merge pull request #131: fix: LangGraph checkpointer pooler connectivity + progress modal state + auth single-click & Terms modal
5. **97ce7ba** (2026-06-08) - chore(deps): move runtime to Node 24 LTS + keep @types/node on v24 (#128)
   - Upgrades to Node 24 (Active LTS). Docker, CI, .nvmrc updated.
6. **dd484f1** (2026-06-08) - chore(deps): migrate to lucide-react v1.17 (#129)
   - Adds brand-icons.tsx for Linkedin/X to replace removed icons.
7. **e59d3a7** (2026-06-08) - fix(auth): single-click redirect after login/signup + Terms agreement modal
   - Fixed stale cache issue requiring two clicks. Added mandatory Terms modal on signup.
8. **95d25f6** (2026-06-08) - fix(pipeline,ui): drive the progress modal from real pipeline state
   - Fixed progress modal for LangGraph path and failure states.
9. **28decf5** (2026-06-08) - fix(pipeline): connect LangGraph checkpointer via the IPv4 pooler
   - Critical fix for Supabase pooler connectivity on Railway (IPv4). Rewrites direct URL and pins ssl.
10. **84d7ed2** (2026-06-07) - Merge pull request #130 (various improvements)

**Key themes in recent work:**
- Heavy focus on making the AI pipeline (LangGraph) reliable in production (checkpointer, progress tracking, error handling).
- Blog automation and daily content publishing for SEO/TTML.
- Auth UX polish and legal compliance (Terms on signup).
- Keeping dependencies secure and up-to-date (multiple chore(deps) PRs).
- Local ttml-work-app may have additional blog-poster related merges (e.g. publish-batch.py fixes) that are being integrated.

**Local state note (as of last check):**
- ttml-work-app (Tesla Laptops root): Tracks origin https://github.com/moizj00/ttml-app. Latest local commit around blog-poster script fixes. May be slightly ahead or on a merge branch for recent content work.
- There is also a moizjmj/ttml-app-work copy with uncommitted changes (published-topics.md, blog/ dir) and matching recent remote commits.
- To fully sync: `git pull origin main` (auth required in terminal) or use GitHub to compare.

---

## Core Project Memory (from previous export)

## 1. Instructions

[See previous detailed writing and code rules in the full history. Key project-specific:]

- Strict enforcement of the letter status machine (shared/types/letter.ts).
- Mandatory attorney review: ai_draft is immutable; always create attorney_edit versions.
- All DB access through server/db/* (never raw Drizzle in routers).
- Use specific tRPC procedures for RBAC (subscriberProcedure, attorneyProcedure, adminProcedure, superAdminProcedure).
- Pipeline must respect 24h free preview cooling window and paywall logic.
- Pre-change checklist: always verify schema, transitions, guards, pricing in shared/pricing.ts, etc.
- Tailwind v4 OKLCH only (no tailwind.config.js).
- LangGraph calls go through callLlmWithFailover.
- Validation gate: pnpm revalidate before PRs.

(Full writing craft rules from user's Obsidian vault — core principles, anti-AI-tells, preflight checklist, voice fingerprint — should be loaded when doing content work.)

## 2. Identity
(See previous export — user maintains sophisticated agent memory and writing systems. Primary project is TTML legal letter platform.)

## 3. Career
Active development of TTML (Talk-to-My-Lawyer) production platform + supporting content/automation systems. Heavy use of custom agent skills for development and writing.

## 4. Projects
- **Talk-to-My-Lawyer (TTML / ttml-app / ttml-work-app)**: Main product. Full-stack (React 19/Vite + Express/tRPC + Supabase + Drizzle + pg-boss + LangGraph pipeline + Stripe + Resend). Attorney-reviewed legal letters with complex state machine, paywalls, and AI pipeline.
  - Current status: Active development with daily blog publishing, pipeline hardening (LangGraph reliability, auth fixes, pooler fixes), dependency upgrades.
  - Key decisions: Single Docker image for app + worker + migrate roles. Strict status machine. Immutable ai_draft versions.
- Other: ttml-blog (dedicated blog content repo), various agent skills for outreach, content, video, etc.

## 5. Preferences
- Detailed, machine-readable instructions in AGENTS.md / CLAUDE.md / MEMORIES.md for agents.
- Strong preference for concrete/specific writing, anti-AI patterns, and human-like craft (see Obsidian Clippings for full rules).
- Parallel projects with strong documentation and git discipline.
- Recent emphasis on production reliability for the AI pipeline and content automation.

---

**Last updated:** 2026-06-08 (incorporating latest GitHub commits and local sync status).

To refresh this file with newer activity: Ask the agent to "update MEMORIES.md with latest commits from GitHub" and run the appropriate list_commits / git log commands.

This file is committed to the repo so it travels with the code for any agent working in the directory.