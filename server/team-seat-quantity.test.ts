/**
 * team-seat-quantity.test.ts — Stripe seat-quantity update (the money path used
 * when inviting beyond paid seats). Pins that it targets the subscription's line
 * item with the new quantity and charges prorated.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const stripeMocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  update: vi.fn(),
}));

vi.mock("./stripe/client", () => ({
  getStripe: () => ({
    subscriptions: { retrieve: stripeMocks.retrieve, update: stripeMocks.update },
  }),
  getOrCreateStripeCustomer: vi.fn(),
}));

const { updateTeamSeatQuantity } = await import("./stripe/subscriptions");

beforeEach(() => {
  stripeMocks.retrieve.mockReset();
  stripeMocks.update.mockReset();
});

describe("updateTeamSeatQuantity", () => {
  it("updates the first line item to the new quantity with proration", async () => {
    stripeMocks.retrieve.mockResolvedValue({
      id: "sub_team_1",
      items: { data: [{ id: "si_123" }] },
    });
    stripeMocks.update.mockResolvedValue({});

    await updateTeamSeatQuantity("sub_team_1", 6);

    expect(stripeMocks.retrieve).toHaveBeenCalledWith("sub_team_1");
    expect(stripeMocks.update).toHaveBeenCalledWith("sub_team_1", {
      items: [{ id: "si_123", quantity: 6 }],
      proration_behavior: "create_prorations",
    });
  });

  it("throws (and does not call update) when the subscription has no line item", async () => {
    stripeMocks.retrieve.mockResolvedValue({ id: "sub_x", items: { data: [] } });
    await expect(updateTeamSeatQuantity("sub_x", 3)).rejects.toThrow(/no line item/i);
    expect(stripeMocks.update).not.toHaveBeenCalled();
  });
});
