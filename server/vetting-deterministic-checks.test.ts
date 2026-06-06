/**
 * Deterministic vetting safety layer — unit tests.
 *
 * The LangGraph vetting node grades the letter with an LLM, but a model
 * grading its sibling stage's output systematically over-scores. So vetting
 * also runs `runDeterministicVettingChecks`, which OR's hard, LLM-free checks
 * into `qualityDegraded`:
 *
 *   - Jurisdiction mismatch (cites another US state's statutory authority) →
 *     forces degrade regardless of the model's score.
 *   - Every statute/case citation is surfaced as an explicit attorney-
 *     verification warning because LangGraph research is ungrounded.
 *
 * These are pure-function tests — no LLM, DB, or network mocking required.
 */
import { describe, it, expect } from "vitest";
import { runDeterministicVettingChecks } from "./pipeline/graph/nodes/vetting";
import { normalizeIntake } from "./pipeline/graph/memory";

const caCtx = normalizeIntake({
  jurisdiction: { state: "CA", country: "US" },
  letterType: "demand",
  sender: { name: "Alice Subscriber" },
  recipient: { name: "Bob Landlord" },
});

describe("runDeterministicVettingChecks — deterministic legal-safety layer", () => {
  it("forces degrade when the letter cites another state's law (jurisdiction mismatch)", () => {
    const letter = `Dear Bob Landlord,\n\nPursuant to Texas Property Code § 92.109, Alice Subscriber demands return of the deposit.\n\nSincerely,\nAlice Subscriber`;
    const result = runDeterministicVettingChecks(letter, caCtx);
    expect(result.degraded).toBe(true);
    expect(result.jurisdictionMismatch).toBeTruthy();
    expect(result.warnings.join("\n")).toMatch(/JURISDICTION MISMATCH/i);
  });

  it("does NOT degrade a clean, jurisdiction-consistent California letter", () => {
    const letter = `Dear Bob Landlord,\n\nPursuant to California Civil Code § 1950.5, Alice Subscriber demands return of the security deposit held since March 2025.\n\nSincerely,\nAlice Subscriber`;
    const result = runDeterministicVettingChecks(letter, caCtx);
    expect(result.degraded).toBe(false);
    expect(result.jurisdictionMismatch).toBeNull();
  });

  it("does NOT degrade when an out-of-state PARTY/location is mentioned but no foreign law is cited", () => {
    // Regression guard: the mismatch gate keys off foreign-state references
    // INSIDE a citation, not a bare state name near governing-law language. A
    // California letter that notes the recipient is in Texas must not degrade.
    const letter = `Dear Bob Landlord,\n\nAlthough you are headquartered in Texas, this matter is governed exclusively by California law. Pursuant to California Civil Code § 1950.5, Alice Subscriber demands return of the deposit.\n\nSincerely,\nAlice Subscriber`;
    const result = runDeterministicVettingChecks(letter, caCtx);
    expect(result.degraded).toBe(false);
    expect(result.jurisdictionMismatch).toBeNull();
  });

  it("degrades on an ABBREVIATED foreign-state statute (e.g. Ariz. Rev. Stat.)", () => {
    const letter = `Dear Bob Landlord,\n\nPursuant to Ariz. Rev. Stat. § 33-1321, Alice Subscriber demands return of the deposit.\n\nSincerely,\nAlice Subscriber`;
    const result = runDeterministicVettingChecks(letter, caCtx);
    expect(result.degraded).toBe(true);
    expect(result.jurisdictionMismatch).toMatch(/Arizona/);
  });

  it("does NOT degrade a federal case whose party name is a state (e.g. Texas v. Johnson)", () => {
    // "Texas" here is a case party, near the word "Court" — the old broad
    // heuristic flagged this; the citation-scoped statute gate must not, because
    // there is no statutory marker attributing Texas law.
    const letter = `Dear Bob Landlord,\n\nAs the Supreme Court held in Texas v. Johnson, 491 U.S. 397, the First Amendment protects expression. This matter is governed by California law.\n\nSincerely,\nAlice Subscriber`;
    const result = runDeterministicVettingChecks(letter, caCtx);
    expect(result.degraded).toBe(false);
    expect(result.jurisdictionMismatch).toBeNull();
  });

  it("surfaces every citation as an explicit attorney-verification warning (research is ungrounded)", () => {
    const letter = `Dear Bob Landlord,\n\nUnder California Civil Code § 1950.5, Alice Subscriber demands payment within 14 days.\n\nSincerely,\nAlice Subscriber`;
    const result = runDeterministicVettingChecks(letter, caCtx);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.startsWith("VERIFY CITATION"))).toBe(true);
  });

  it("never throws on empty or citation-free input (fails open to the LLM grade)", () => {
    const result = runDeterministicVettingChecks("", caCtx);
    expect(result.degraded).toBe(false);
    expect(result.citations).toEqual([]);
  });
});
