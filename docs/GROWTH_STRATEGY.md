# TTML Growth & Monetization Strategy

A concrete, codebase-grounded plan for turning TTML into a commercially
successful enterprise product. This is the commercial counterpart to
[`docs/security/security-overview.md`](security/security-overview.md) (the
enterprise-readiness side). It is opinionated and meant to be executed and
revised, not admired.

_Authored 2026-06-13. Grounded in `shared/pricing.ts`, the free-preview funnel,
and the enterprise-readiness audit._

---

## 1. Where revenue comes from today

Current packaging (`shared/pricing.ts` — single source of truth):

| Plan | Price | Letters | Motion |
| --- | --- | --- | --- |
| One-time letter | $200 | 1 | Special-offer popup on `/pricing` |
| Monthly | $299/mo | 4 / mo | Main grid |
| Yearly | $2,400/yr | 8 / yr | Main grid (best value) |

The core conversion engine is the **free preview → paid** funnel: a prospect
submits one letter, the AI drafts it, a 24-hour hold elapses, the watermarked
draft is revealed, and the CTA pushes to "submit for attorney review" → payment.
This is the single most important number in the business; everything below
either feeds it or extends it.

## 2. The three levers, in priority order

### Lever 1 — Convert more of the existing funnel (fastest revenue)

The funnel already exists and is instrumented enough to improve. Highest-ROI,
lowest-risk work:

1. **Make conversion measurable end-to-end.** Define the funnel as explicit
   stages (submitted → draft-ready → preview-viewed → checkout-started → paid)
   and emit a single analytics event per transition from the status machine.
   You cannot optimize what you cannot see; today success rate / drop-off is not
   trivially queryable. _This is the prerequisite for everything else in Lever 1._
2. **Abandoned-draft recovery is live (`draftReminders`) — tune it.** Measure
   open→pay lift per reminder; add a second touch with the watermarked preview
   inline.
3. **Reduce the 24-hour hold friction for warm buyers.** The hold is a
   deliberate trust device, but offer an explicit "skip the wait — submit for
   review now" path for users who are ready, capturing intent at peak.
4. **Price-anchor the one-time offer against the subscription.** The $200
   one-time letter is the wedge; the popup should always show the per-letter math
   ($299/mo = ~$75/letter) so single-buyers see the subscription as the rational
   upgrade.

### Lever 2 — Unlock B2B / enterprise (highest ACV, the "very successful" path)

This is the largest revenue multiplier and the #1 blocker today: **there is no
organization/team/seat concept** — accounts are strictly single-user, so the
product literally cannot model "a law firm / collections agency / property
manager with N users sharing a letter pool." Until this exists, every enterprise
sales conversation stalls on the first call.

Build, in order:

1. **Organizations + members + seats.** Additive schema: `organizations`,
   `organization_members` (role: owner/admin/member), nullable `organizationId`
   on `users` and `letter_requests`. Every existing user becomes a solo org of
   one — non-breaking. Shared letter pool at the org level.
2. **Seat-based billing.** Extend Stripe checkout to per-seat subscription
   quantities; the entitlement check moves from per-user to per-org pool
   (`letters_allowed`/`letters_used` at the org).
3. **Org admin console.** Invite/remove members, view the shared pool, see all
   org letters. This is what makes a 5-figure annual contract make sense.
4. **Enterprise tier pricing.** Introduce an annual, seat-priced enterprise plan
   above Yearly, sold with the security pack below.

ACV math: a 10-seat firm at even a modest per-seat annual price is an order of
magnitude above a single $2,400 yearly subscription. Ten such accounts change
the trajectory of the business.

### Lever 3 — Remove the enterprise procurement blockers (enables Lever 2 to close)

Enterprise buyers (law firms especially, bound by their own confidentiality
duties) will not sign without these. Several are now in place; the rest are the
gating items:

- ✅ Security overview + subprocessor list (`docs/security/`).
- ✅ Diligence-grade controls hardened: payments idempotency, attorney-review
  enforcement on delivery, fail-closed cron auth, server-side authorization.
- ⏳ **Signed DPA** + LLM provider zero-retention/no-training terms (legal +
  vendor work).
- ⏳ **Data-subject rights**: self-service export + hard-delete + retention
  schedule (the Privacy Policy already promises these; the code must deliver
  them — currently a deceptive-practices exposure as well as a deal-blocker).
- ⏳ **SSO/SAML** for team accounts.

## 3. Demand & distribution (founder-led, supported by the product)

- **SEO / AI-agent answer optimization** is the cheapest durable channel for a
  California-specific legal-letter product — keep shipping the blog/databank and
  ensure pages are structured to be cited by AI assistants (the buyer's first
  stop is increasingly an LLM, not Google).
- **Outreach pipeline** (the existing scrape→enrich→send→track system) is the
  direct-sales motion for the B2B/org tier above; point it at the segments with
  repetitive demand-letter volume: property managers, collections, small-claims-
  heavy SMBs, agencies.
- **Affiliate loop** already exists (`commissionLedger`, 20% discount,
  5% commission) — wire it explicitly into the org tier so existing customers
  refer firms.

## 4. The one-quarter focus

If only one thing ships next, it is **Lever 2, step 1–2 (organizations + seat
billing)**: it is both the enterprise-readiness blocker and the commercial
unlock — the single change that most moves "enterprise product AND very
successful" simultaneously. Lever 1's funnel instrumentation should ship
alongside it because it is cheap and makes every later decision data-driven.

## 5. Scorecard (instrument these — you can't call it "successful" without them)

- Free-preview → paid conversion rate (and drop-off per stage).
- Paid-letter unit economics: LLM + attorney cost per letter vs price.
- MRR / ARR, by plan, with one-time vs subscription split.
- B2B: orgs, seats, seats/org, net revenue retention once seat billing exists.
- Attorney-review turnaround time (the operational constraint on scaling volume).
