/**
 * vetting-parse.test.ts — fail-closed vetting report parsing.
 *
 * Regression guard for the vetting fail-open defect: a vetting LLM can return
 * valid JSON of the WRONG shape (e.g. `{"verdict":"ok"}`). Before the fix, the
 * unchecked `as VettingReport` cast left required array fields undefined, the
 * downstream `.jurisdictionIssues.map(...)` threw, withErrorRecovery swallowed
 * it, and routeAfterVetting finalized the letter as CLEAN (qualityDegraded=false,
 * no warning) — an unvettable letter slipping through silently.
 *
 * normalizeVettingReport now treats wrong-shape JSON exactly like unparseable
 * JSON: it returns the fail-closed fallback (degraded / unverified) and never a
 * clean pass, and it coerces every array field so no `.map()` can throw.
 */
import { describe, it, expect } from "vitest";
import { normalizeVettingReport } from "./nodes/vetting";

// Mirrors the PARSE_FAILURE_REPORT the vetting node uses: fail-closed.
const FAIL_CLOSED = {
  riskLevel: "high" as const,
  qualityDegraded: true,
  jurisdictionIssues: [],
  citationsFlagged: [],
  factualIssuesFound: ["VETTING_PARSE_FAILED"],
  overallScore: 5,
  summary: "Vetting parse failed — quality is unverified",
  recommendations: ["Attorney must manually verify."],
};

describe("normalizeVettingReport — fail-closed shape validation", () => {
  it("returns a well-formed report unchanged (arrays preserved)", () => {
    const good = {
      riskLevel: "low",
      qualityDegraded: false,
      jurisdictionIssues: ["a"],
      citationsFlagged: ["b"],
      factualIssuesFound: [],
      overallScore: 9,
      summary: "looks good",
      recommendations: ["ship it"],
    };
    const out = normalizeVettingReport(good, FAIL_CLOSED);
    expect(out.qualityDegraded).toBe(false);
    expect(out.riskLevel).toBe("low");
    expect(out.overallScore).toBe(9);
    expect(out.jurisdictionIssues).toEqual(["a"]);
    expect(out.recommendations).toEqual(["ship it"]);
  });

  it("treats valid JSON of the WRONG shape as fail-closed (NOT a clean pass)", () => {
    const out = normalizeVettingReport({ verdict: "ok" }, FAIL_CLOSED);
    expect(out.qualityDegraded).toBe(true);
    expect(out).toEqual(FAIL_CLOSED);
  });

  it("rejects an invalid riskLevel value as fail-closed", () => {
    const out = normalizeVettingReport(
      { riskLevel: "totally-fine", qualityDegraded: false, overallScore: 10 },
      FAIL_CLOSED,
    );
    expect(out.qualityDegraded).toBe(true);
  });

  it("rejects missing core signals (no qualityDegraded boolean) as fail-closed", () => {
    const out = normalizeVettingReport(
      { riskLevel: "low", overallScore: 8 },
      FAIL_CLOSED,
    );
    expect(out.qualityDegraded).toBe(true);
  });

  it("coerces missing/garbage array fields to [] when core signals are valid", () => {
    // Core signals valid, but array fields absent or wrong-typed. Must NOT throw
    // and must yield real arrays so the node's downstream .map() calls are safe.
    const out = normalizeVettingReport(
      {
        riskLevel: "medium",
        qualityDegraded: true,
        overallScore: 6,
        jurisdictionIssues: "not-an-array",
        citationsFlagged: null,
        // factualIssuesFound omitted entirely
        recommendations: [1, "keep this", { x: 1 }],
      },
      FAIL_CLOSED,
    );
    expect(Array.isArray(out.jurisdictionIssues)).toBe(true);
    expect(out.jurisdictionIssues).toEqual([]);
    expect(out.citationsFlagged).toEqual([]);
    expect(out.factualIssuesFound).toEqual([]);
    // Non-string entries filtered out, strings kept.
    expect(out.recommendations).toEqual(["keep this"]);
    // The .map() calls the vetting node runs on these must not throw.
    expect(() => out.jurisdictionIssues.map((s) => `JURISDICTION: ${s}`)).not.toThrow();
  });

  it.each([null, undefined, "a string", 42, true, []])(
    "treats non-object value %p as fail-closed",
    (value) => {
      const out = normalizeVettingReport(value, FAIL_CLOSED);
      expect(out.qualityDegraded).toBe(true);
    },
  );
});
