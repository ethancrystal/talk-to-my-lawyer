/**
 * Stripe Products & Pricing Configuration
 * Talk-to-My-Lawyer — Legal Letter Generation Platform
 *
 * Pricing model (source of truth: shared/pricing.ts):
 *  one_time_letter — $200 one-time: 1 letter, attorney review included
 *                    (surfaced via special-offer popup on /pricing, not a grid card)
 *  monthly        — $299/month: 4 letters/month, attorney review included
 *  yearly         — $2,400/year: 8 letters total, attorney review included
 *
 * Legacy plan IDs kept for backward compatibility with existing Stripe subscriptions:
 *  per_letter   → treated as monthly ($299/month, 4 letters)
 *  monthly_basic → treated as monthly ($299/month, 4 letters)
 *  monthly_pro   → treated as monthly ($299/month, 4 letters)
 *  starter      → treated as monthly ($299/month, 4 letters)
 *  professional → treated as monthly ($299/month, 4 letters)
 *  free_trial   → treated as monthly (legacy)
 *  free_trial_review → treated as monthly (legacy)
 *  annual       → treated as yearly ($2,400/year, 8 letters)
 */

import {
  MONTHLY_PRICE_CENTS,
  ONE_TIME_LETTER_PRICE_CENTS,
  YEARLY_PRICE_CENTS,
  TEAM_PLAN,
  TEAM_PRICE_PER_SEAT_CENTS,
  TEAM_LETTERS_PER_SEAT,
} from "../shared/pricing";

export {
  MONTHLY_PRICE_CENTS,
  ONE_TIME_LETTER_PRICE_CENTS,
  YEARLY_PRICE_CENTS,
  TEAM_PRICE_PER_SEAT_CENTS,
};

export interface PlanConfig {
  id: "monthly" | "yearly" | "one_time_letter" | "team";
  name: string;
  description: string;
  /**
   * Price in cents. For per-seat plans (interval "month" + isPerSeat) this is
   * the PER-SEAT unit price; the checkout multiplies by the seat quantity.
   */
  price: number;
  interval: "one_time" | "month" | "year";
  /**
   * Letters granted. For per-seat team plans this is PER SEAT — the org's
   * pooled allowance is seats × lettersAllowed (see teamLetterPool).
   */
  lettersAllowed: number;
  /** True for per-seat team/enterprise plans (Stripe line-item quantity = seats). */
  isPerSeat?: boolean;
  badge?: string;
  features: string[];
}

/** Price in cents for Monthly ($299/month) — from shared/pricing.ts */
// MONTHLY_PRICE_CENTS re-exported above from shared/pricing.ts

/** Price in cents for Yearly ($2,400/year) — from shared/pricing.ts */
// YEARLY_PRICE_CENTS re-exported above from shared/pricing.ts

export const PLANS: Record<string, PlanConfig> = {
  one_time_letter: {
    id: "one_time_letter",
    name: "Single Letter",
    description:
      "One attorney-reviewed legal letter — no subscription required",
    price: ONE_TIME_LETTER_PRICE_CENTS, // $200 one-time
    interval: "one_time",
    lettersAllowed: 1,
    badge: "Special Offer",
    features: [
      "1 attorney-reviewed letter",
      "California-focused drafting engine",
      "Professional legal research",
      "Final approved PDF",
      "Email delivery",
      "No recurring charges",
    ],
  },
  monthly: {
    id: "monthly",
    name: "Monthly",
    description: "4 attorney-reviewed letters per month",
    price: MONTHLY_PRICE_CENTS, // $299/month
    interval: "month",
    lettersAllowed: 4,
    badge: "Most Popular",
    features: [
      "4 professional legal letters/month",
      "Attorney review included",
      "Professional legal research",
      "All letter types supported",
      "Final approved PDFs",
      "Email delivery",
      "Priority support",
      "Cancel anytime",
    ],
  },
  yearly: {
    id: "yearly",
    name: "Yearly",
    description: "8 attorney-reviewed letters per year, billed annually",
    price: YEARLY_PRICE_CENTS, // $2,400/year
    interval: "year",
    lettersAllowed: 8,
    badge: "Best Value",
    features: [
      "8 professional legal letters per year",
      "Attorney review included",
      "Professional legal research",
      "All letter types supported",
      "Final approved PDFs",
      "Email delivery",
      "Priority support",
      "Cancel anytime",
    ],
  },
  // Team / Enterprise — per-seat subscription with a pooled allowance. Resolved
  // by getPlanConfig for seat checkout + the provisioning webhook, but kept OUT
  // of the public ALL_PLANS / PAID_PLANS grid (sales-led via a dedicated CTA).
  team: {
    id: "team",
    name: TEAM_PLAN.name,
    description: TEAM_PLAN.description,
    price: TEAM_PRICE_PER_SEAT_CENTS, // PER SEAT — checkout multiplies by quantity
    interval: "month",
    lettersAllowed: TEAM_LETTERS_PER_SEAT, // PER SEAT — pool = seats × this
    isPerSeat: true,
    badge: "For Teams",
    features: [...TEAM_PLAN.features],
  },
};

/**
 * Legacy plan ID aliases — maps old Stripe plan IDs to current plan configs.
 * Used for backward compatibility with existing subscriptions.
 */
export const LEGACY_PLAN_ALIASES: Record<string, string> = {
  per_letter: "monthly", // old per-letter → monthly
  monthly_basic: "monthly", // old monthly_basic → monthly
  monthly_pro: "monthly", // old monthly_pro → monthly
  starter: "monthly", // old starter → monthly
  professional: "monthly", // old professional → monthly
  free_trial: "monthly", // old free trial → monthly
  free_trial_review: "monthly", // old free trial review → monthly
  annual: "yearly", // old annual → yearly
};

export const PLAN_LIST = Object.values(PLANS);

export function getPlanConfig(planId: string): PlanConfig | undefined {
  // Check direct match first
  if (PLANS[planId]) return PLANS[planId];
  // Fall back to legacy alias
  const aliasId = LEGACY_PLAN_ALIASES[planId];
  if (aliasId) return PLANS[aliasId];
  return undefined;
}

export function canSubmitLetter(
  plan: string,
  lettersAllowed: number,
  lettersUsed: number,
  status: string
): { allowed: boolean; reason?: string } {
  if (status !== "active") {
    return {
      allowed: false,
      reason: "No active subscription. Please subscribe to submit a letter.",
    };
  }
  if (lettersAllowed < 0) {
    return {
      allowed: false,
      reason: "Invalid plan configuration. Please contact support.",
    };
  }
  if (lettersUsed >= lettersAllowed) {
    return {
      allowed: false,
      reason: `You have used all ${lettersAllowed} letter(s) in your ${plan} plan. Please upgrade to continue.`,
    };
  }
  return { allowed: true };
}
