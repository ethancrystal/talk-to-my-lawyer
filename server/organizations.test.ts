/**
 * organizations.test.ts — B2B team-account DAL foundation.
 *
 * Covers the entitlement seam (resolveUserLetterScope) and the deterministic
 * org-selection rule that future per-org pooling and seat billing build on.
 * The schema change is purely additive (two new tables), so these tests pin the
 * resolver behavior without touching any existing entitlement flow.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetDb = vi.fn();
vi.mock("./db/core", () => ({
  getDb: (...a: unknown[]) => mockGetDb(...a),
  getReadDb: (...a: unknown[]) => mockGetDb(...a),
}));

const {
  getOrganizationForUser,
  resolveUserLetterScope,
} = await import("./db/organizations");

/**
 * Build a getDb mock whose select→from→innerJoin→where chain resolves to the
 * supplied rows (matching the shape getOrganizationForUser selects).
 */
function dbReturning(rows: any[]) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(rows),
        }),
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getOrganizationForUser — deterministic selection", () => {
  it("returns null for a solo user (no membership rows)", async () => {
    mockGetDb.mockResolvedValue(dbReturning([]));
    expect(await getOrganizationForUser(7)).toBeNull();
  });

  it("prefers the org the user OWNS over one they're merely a member of", async () => {
    mockGetDb.mockResolvedValue(
      dbReturning([
        { org: { id: 10, name: "Member Co", lettersAllowed: 4, lettersUsed: 0 }, role: "member" },
        { org: { id: 20, name: "Owner Firm", lettersAllowed: 8, lettersUsed: 2 }, role: "owner" },
      ])
    );
    const org = await getOrganizationForUser(7);
    expect(org?.id).toBe(20);
    expect(org?.memberRole).toBe("owner");
  });

  it("falls back to the lowest org id when there is no owner role", async () => {
    mockGetDb.mockResolvedValue(
      dbReturning([
        { org: { id: 30, name: "B", lettersAllowed: 4, lettersUsed: 0 }, role: "member" },
        { org: { id: 15, name: "A", lettersAllowed: 4, lettersUsed: 0 }, role: "admin" },
      ])
    );
    const org = await getOrganizationForUser(7);
    expect(org?.id).toBe(15);
  });
});

describe("resolveUserLetterScope — entitlement seam", () => {
  it("returns a USER scope (fall back to personal subscription) for a solo user", async () => {
    mockGetDb.mockResolvedValue(dbReturning([]));
    const scope = await resolveUserLetterScope(7);
    expect(scope.kind).toBe("user");
    expect(scope.organizationId).toBeNull();
    expect(scope.lettersAllowed).toBeNull();
  });

  it("returns an ORGANIZATION scope with the shared pool for an org member", async () => {
    mockGetDb.mockResolvedValue(
      dbReturning([
        { org: { id: 20, name: "Owner Firm", lettersAllowed: 200, lettersUsed: 37 }, role: "owner" },
      ])
    );
    const scope = await resolveUserLetterScope(7);
    expect(scope.kind).toBe("organization");
    expect(scope.organizationId).toBe(20);
    expect(scope.organizationRole).toBe("owner");
    expect(scope.lettersAllowed).toBe(200);
    expect(scope.lettersUsed).toBe(37);
  });
});
