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
