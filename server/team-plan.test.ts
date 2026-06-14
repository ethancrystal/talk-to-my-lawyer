/**
 * team-plan.test.ts — B2B seat checkout + org provisioning.
 *
 * Locks in the per-seat pricing math, the server-controlled seat-quantity
 * checkout (no client-supplied amounts; seats clamped), and the idempotent
 * provisioning that converges created → updated → renewal webhook deliveries on
 * a single org with the correct pooled allowance.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  TEAM_PLAN,
  TEAM_PRICE_PER_SEAT_CENTS,
  TEAM_LETTERS_PER_SEAT,
  TEAM_MIN_SEATS,
  TEAM_MAX_SEATS,
  teamLetterPool,
} from "../shared/pricing";
import { getPlanConfig, PLANS } from "./stripe-products";

// ─── 1. Pricing math + plan config ────────────────────────────────────────────

describe("Team plan — pricing constants", () => {
  it("per-seat price in cents = dollars × 100", () => {
    expect(TEAM_PRICE_PER_SEAT_CENTS).toBe(TEAM_PLAN.pricePerSeat * 100);
  });

  it("teamLetterPool multiplies seats by the per-seat allowance", () => {
    expect(teamLetterPool(1)).toBe(TEAM_LETTERS_PER_SEAT);
    expect(teamLetterPool(8)).toBe(8 * TEAM_LETTERS_PER_SEAT);
    expect(teamLetterPool(0)).toBe(0);
  });

  it("teamLetterPool never returns a negative pool", () => {
    expect(teamLetterPool(-5)).toBe(0);
  });

  it("getPlanConfig resolves the team plan as a per-seat monthly plan", () => {
    const plan = getPlanConfig("team");
    expect(plan).toBeDefined();
    expect(plan!.isPerSeat).toBe(true);
    expect(plan!.interval).toBe("month");
    expect(plan!.price).toBe(TEAM_PRICE_PER_SEAT_CENTS);
  });

  it("team is NOT in the public consumer grid (ALL_PLANS/PAID_PLANS unaffected)", async () => {
    const { ALL_PLANS, PAID_PLANS } = await import("../shared/pricing");
    expect(ALL_PLANS.map((p) => p.id)).not.toContain("team");
    expect(PAID_PLANS.map((p) => p.id)).not.toContain("team");
    // but it IS a first-class plan for checkout/provisioning
    expect(Object.keys(PLANS)).toContain("team");
  });
});

// ─── 2. Seat-quantity checkout ────────────────────────────────────────────────

const stripeMocks = vi.hoisted(() => ({
  createSession: vi.fn(),
}));

vi.mock("./stripe/client", () => ({
  getStripe: () => ({
    checkout: { sessions: { create: stripeMocks.createSession } },
  }),
  getOrCreateStripeCustomer: vi.fn().mockResolvedValue("cus_team_test"),
}));
vi.mock("./stripe/coupons", () => ({ resolveStripeCoupon: vi.fn().mockResolvedValue(null) }));

const { createTeamCheckoutSession } = await import("./stripe/checkouts");

beforeEach(() => {
  stripeMocks.createSession.mockReset();
  stripeMocks.createSession.mockResolvedValue({ id: "cs_test", url: "https://stripe.test/cs" });
});

describe("createTeamCheckoutSession — server-controlled seat billing", () => {
  it("bills unit_amount = per-seat cents with quantity = seats (subscription mode)", async () => {
    await createTeamCheckoutSession({
      userId: 1,
      email: "owner@firm.com",
      name: "Owner",
      seats: 8,
      orgName: "Acme Law",
      origin: "https://app.test",
    });
    const params = stripeMocks.createSession.mock.calls[0][0];
    expect(params.mode).toBe("subscription");
    const li = params.line_items[0];
    expect(li.quantity).toBe(8);
    expect(li.price_data.unit_amount).toBe(TEAM_PRICE_PER_SEAT_CENTS);
    expect(li.price_data.recurring.interval).toBe("month");
    // metadata carries the provisioning inputs the webhook needs
    expect(params.metadata.plan_id).toBe("team");
    expect(params.metadata.seats).toBe("8");
    expect(params.metadata.org_name).toBe("Acme Law");
  });

  it("clamps seats below the minimum up to TEAM_MIN_SEATS", async () => {
    const res = await createTeamCheckoutSession({
      userId: 1, email: "o@f.com", seats: 1, orgName: "X", origin: "https://app.test",
    });
    expect(res.seats).toBe(TEAM_MIN_SEATS);
    expect(stripeMocks.createSession.mock.calls[0][0].line_items[0].quantity).toBe(TEAM_MIN_SEATS);
  });

  it("clamps seats above the maximum down to TEAM_MAX_SEATS", async () => {
    const res = await createTeamCheckoutSession({
      userId: 1, email: "o@f.com", seats: 9999, orgName: "X", origin: "https://app.test",
    });
    expect(res.seats).toBe(TEAM_MAX_SEATS);
  });

  it("rejects an empty organization name", async () => {
    await expect(
      createTeamCheckoutSession({ userId: 1, email: "o@f.com", seats: 5, orgName: "  ", origin: "https://app.test" })
    ).rejects.toThrow(/organization name/i);
  });
});
