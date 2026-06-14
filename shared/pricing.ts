/**
 * Talk to My Lawyer — Pricing Constants
 *
 * SINGLE SOURCE OF TRUTH for all pricing across frontend and backend.
 * Import from here — never hardcode prices in components or procedures.
 *
 * Pricing model:
 *  - One-Time:      $200 one-time (1 letter, surfaced via special-offer popup)
 *  - Monthly:       $299/month (4 letters/month)
 *  - Yearly:        $2,400/year (8 letters total)
 *
 * The one-time letter offering is shown only via the SingleLetterOfferModal
 * popup on /pricing — it is intentionally not a third card in the main grid.
 */

export const PRICING = {
  /**
   * One-Time Letter — $200 single-letter purchase, surfaced via the
   * special-offer popup on /pricing. Same attorney-review flow as
   * subscription plans, just billed once for one letter.
   */
  oneTimeLetter: {
    id: "one_time_letter",
    name: "Single Letter",
    price: 200,
    priceDisplay: "$200",
    period: "one-time",
    lettersIncluded: 1,
    description:
      "One California-focused legal-letter draft with attorney review — no subscription required.",
    features: [
      "1 attorney-reviewed letter",
      "California-focused drafting engine",
      "Structured from curated legal-letter patterns",
      "Licensed attorney review & approval",
      "PDF download of approved draft",
      "No recurring charges",
    ],
  },

  /**
   * Single Letter — $299 one-time (legacy)
   * @deprecated Superseded by the $200 oneTimeLetter offering above.
   * Kept ONLY for backward compat with legacy Stripe products and existing
   * customers whose subscriptions row references plan_id="single_letter".
   * Do not surface in UI; do not create new Stripe checkouts against it.
   */
  singleLetter: {
    id: "single_letter",
    name: "Single Letter (legacy)",
    price: 299,
    priceDisplay: "$299",
    period: "one-time",
    lettersIncluded: 1,
    description:
      "One California-focused legal-letter draft with optional attorney review. No subscription required.",
    features: [
      "California-focused drafting engine",
      "Structured from curated legal-letter patterns",
      "Licensed attorney review & approval",
      "PDF download of approved draft",
      "Review-friendly output",
    ],
  },

  /** Monthly — $299/month for 4 letters */
  monthly: {
    id: "monthly",
    name: "Monthly",
    price: 299,
    priceDisplay: "$299",
    period: "per month",
    lettersIncluded: 4,
    description: "4 California-focused drafts per month — reduce drafting time for repetitive letters.",
    features: [
      "4 drafts per month",
      "California-focused drafting engine",
      "Structured from curated legal-letter patterns",
      "Licensed attorney review & approval",
      "PDF downloads of approved drafts",
      "Review-friendly outputs",
      "Priority support",
      "Cancel anytime",
    ],
  },

  /** Yearly — $2,400/year for 8 letters total */
  yearly: {
    id: "yearly",
    name: "Yearly",
    price: 2400,
    priceDisplay: "$2,400",
    period: "per year",
    lettersIncluded: 8,
    description: "8 California-focused drafts per year, billed annually. Best value.",
    features: [
      "8 drafts per year",
      "California-focused drafting engine",
      "Structured from curated legal-letter patterns",
      "Licensed attorney review & approval",
      "PDF downloads of approved drafts",
      "Review-friendly outputs",
      "Priority support",
      "Cancel anytime",
    ],
  },
} as const;

/**
 * Team / Enterprise — per-seat subscription with a POOLED letter allowance.
 *
 * Billing model: a firm buys N seats; Stripe bills `pricePerSeat × N` monthly
 * (line-item quantity = seats). The org's shared letter pool is
 * `lettersPerSeat × N`, drawn down by any member (see resolveUserLetterScope /
 * consumeOrganizationLetter). Per-seat rate is a volume discount off the $299
 * solo monthly rate to incentivize team adoption.
 *
 * NOTE: `pricePerSeat` and `lettersPerSeat` are sensible defaults — confirm the
 * final numbers as a business decision. The code structure (per-seat × quantity,
 * pooled allowance) is independent of the exact figures; changing them is a
 * one-line edit here. Intentionally NOT in ALL_PLANS / PAID_PLANS: the team tier
 * is sales-led via a dedicated CTA, not a card in the public 2-plan grid.
 */
export const TEAM_PLAN = {
  id: "team",
  name: "Team",
  pricePerSeat: 249, // $/seat/month — volume discount vs $299 solo
  pricePerSeatDisplay: "$249",
  period: "per seat / month",
  lettersPerSeat: 4, // pooled across the whole org
  minSeats: 2,
  maxSeats: 100,
  description:
    "Shared letter pool for law firms and teams — per-seat billing, pooled monthly allowance, and centralized member administration.",
  features: [
    "Pooled letter allowance shared across the whole team",
    "Per-seat billing — add or remove seats anytime",
    "Centralized admin: invite & manage members",
    "Every letter still attorney-reviewed & approved",
    "Priority support",
  ],
} as const;

/** All plans in display order (subscription-only) */
export const ALL_PLANS = [
  PRICING.monthly,
  PRICING.yearly,
] as const;

/** Plans shown on the public Pricing page (subscription-only) */
export const PAID_PLANS = [
  PRICING.monthly,
  PRICING.yearly,
] as const;

/** Affiliate discount percentage */
export const AFFILIATE_DISCOUNT_PERCENT = 20;

/** Affiliate commission rate in basis points (500 = 5%). Applied to sale amount in cents. */
export const AFFILIATE_COMMISSION_BASIS_POINTS = 500;

/** One-time letter price in cents (for Stripe) — the $200 special-offer plan. */
export const ONE_TIME_LETTER_PRICE_CENTS = PRICING.oneTimeLetter.price * 100;

/** @deprecated Legacy $299 single letter. Kept for backward-compat webhook lookups only. */
export const SINGLE_LETTER_PRICE_CENTS = PRICING.singleLetter.price * 100;

/** Monthly price in cents (for Stripe) */
export const MONTHLY_PRICE_CENTS = PRICING.monthly.price * 100;

/** Yearly price in cents (for Stripe) */
export const YEARLY_PRICE_CENTS = PRICING.yearly.price * 100;

/** Team per-seat monthly price in cents (for Stripe line-item unit_amount). */
export const TEAM_PRICE_PER_SEAT_CENTS = TEAM_PLAN.pricePerSeat * 100;

/** Pooled letters granted per purchased seat (org pool = seats × this). */
export const TEAM_LETTERS_PER_SEAT = TEAM_PLAN.lettersPerSeat;

/** Seat bounds for a team subscription (validated server-side at checkout). */
export const TEAM_MIN_SEATS = TEAM_PLAN.minSeats;
export const TEAM_MAX_SEATS = TEAM_PLAN.maxSeats;

/**
 * Compute the pooled letter allowance for a team subscription of `seats` seats.
 * Single source of truth for the seats → pool math used at checkout, in the
 * provisioning webhook, and on renewal resets.
 */
export function teamLetterPool(seats: number): number {
  return Math.max(0, Math.floor(seats)) * TEAM_LETTERS_PER_SEAT;
}
