import { describe, it, expect, vi } from "vitest";
import type { IntakeJson } from "../shared/types";

vi.mock("./db", () => ({
  updateLetterStatus: vi.fn(),
  createLetterVersion: vi.fn(),
  updateLetterVersionPointers: vi.fn(),
  createWorkflowJob: vi.fn(),
  updateWorkflowJob: vi.fn(),
  getAllUsers: vi.fn(),
}));
vi.mock("./email", () => ({ sendAdminAlertEmail: vi.fn() }));
vi.mock("./freePreviewEmailCron", () => ({
  dispatchFreePreviewIfReady: vi.fn(),
}));

import { buildPrompt, formatIsoDate } from "./pipeline/simple";

const baseIntake: IntakeJson = {
  schemaVersion: "1.0",
  letterType: "consumer-complaint",
  sender: { name: "Daniel Okafor", address: "915 Lakeview Dr, San Jose, CA" },
  recipient: { name: "SoundWave Electronics Inc.", address: "2500 Market St" },
  jurisdiction: { country: "US", state: "CA" },
  matter: {
    category: "consumer-complaint",
    subject: "Refund for defective headphones",
    description: "The left earcup stopped working.",
  },
  desiredOutcome: "Full refund",
};

const NOW = new Date("2026-11-03T20:00:00Z");
const AMOUNT_OWED = 249.99;

describe("formatIsoDate", () => {
  it("formats an ISO date as a long US date", () => {
    expect(formatIsoDate("2026-11-20")).toBe("November 20, 2026");
  });

  it("passes unparseable input through unchanged", () => {
    expect(formatIsoDate("next week")).toBe("next week");
  });
});

describe("buildPrompt intake fields", () => {
  it("includes the response deadline the user entered", () => {
    const prompt = buildPrompt({ ...baseIntake, deadlineDate: "2026-11-20" }, NOW);
    expect(prompt).toContain("**Response Deadline:** November 20, 2026");
    expect(prompt).toContain("state this exact date");
  });

  it("includes amount in dispute and incident date", () => {
    const prompt = buildPrompt(
      {
        ...baseIntake,
        financials: { amountOwed: AMOUNT_OWED, currency: "USD" },
        matter: { ...baseIntake.matter, incidentDate: "2026-10-06" },
      },
      NOW
    );
    expect(prompt).toContain("**Amount in Dispute:** USD 249.99");
    expect(prompt).toContain("**Incident Date:** October 6, 2026");
  });

  it("lists type-specific situation fields with readable labels", () => {
    const prompt = buildPrompt(
      {
        ...baseIntake,
        situationFields: {
          orderNumber: "HP-48213",
          businessName: "SoundWave Electronics Inc.",
          emptyField: "  ",
        },
      },
      NOW
    );
    expect(prompt).toContain("- Order Number: HP-48213");
    expect(prompt).toContain("- Business Name: SoundWave Electronics Inc.");
    expect(prompt).not.toContain("Empty Field");
  });

  it("lists exhibits that have a description", () => {
    const prompt = buildPrompt(
      {
        ...baseIntake,
        exhibits: [
          { label: "Exhibit A", description: "Purchase receipt" },
          { label: "Exhibit B" },
        ],
      },
      NOW
    );
    expect(prompt).toContain("- Exhibit A: Purchase receipt");
    expect(prompt).not.toContain("Exhibit B");
  });

  it("omits the extra blocks when the user left those fields empty", () => {
    const prompt = buildPrompt(baseIntake, NOW);
    expect(prompt).not.toContain("Response Deadline");
    expect(prompt).not.toContain("Amount in Dispute");
    expect(prompt).not.toContain("Case Details");
    expect(prompt).not.toContain("Exhibits Available");
  });
});
