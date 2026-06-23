/**
 * org-invitations.test.ts — invitation token hashing + acceptInvitation guards.
 *
 * The security-critical surface: only the token HASH is stored, and acceptance
 * is single-use, time-limited, and bound to the invited email. These tests pin
 * each rejection path plus the happy enroll-and-consume path.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

const mockGetDb = vi.fn();
vi.mock("./db/core", () => ({
  getDb: (...a: unknown[]) => mockGetDb(...a),
  getReadDb: (...a: unknown[]) => mockGetDb(...a),
}));

const { hashInvitationToken, acceptInvitation } = await import("./db/organizations");

/** Build a transaction stub whose initial invite SELECT yields `inviteRow`. */
function makeDb(inviteRow: any | null) {
  const inserts: any[] = [];
  const updates: any[] = [];
  const tx = {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => (inviteRow ? [inviteRow] : []) }),
      }),
    }),
    insert: () => ({
      values: (v: any) => ({ onConflictDoNothing: async () => { inserts.push(v); } }),
    }),
    update: () => ({
      set: (v: any) => ({ where: async () => { updates.push(v); } }),
    }),
  };
  return {
    db: { transaction: async (fn: any) => fn(tx) },
    inserts,
    updates,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("hashInvitationToken", () => {
  it("is a deterministic SHA-256 hex of the raw token (raw token never stored)", () => {
    const expected = createHash("sha256").update("secret-token").digest("hex");
    expect(hashInvitationToken("secret-token")).toBe(expected);
    expect(hashInvitationToken("secret-token")).toBe(hashInvitationToken("secret-token"));
    expect(hashInvitationToken("other")).not.toBe(expected);
  });
});

describe("acceptInvitation — guards", () => {
  const future = new Date(Date.now() + 60_000);
  const past = new Date(Date.now() - 60_000);

  it("rejects an unknown token (not_found), enrolls nobody", async () => {
    const h = makeDb(null);
    mockGetDb.mockResolvedValue(h.db);
    const r = await acceptInvitation({ rawToken: "x", userId: 1, userEmail: "a@x.com" });
    expect(r).toEqual({ ok: false, reason: "not_found" });
    expect(h.inserts).toHaveLength(0);
  });

  it("rejects a non-pending invite (already accepted/revoked)", async () => {
    const h = makeDb({ id: 5, status: "revoked", email: "a@x.com", expiresAt: future, organizationId: 9, role: "member" });
    mockGetDb.mockResolvedValue(h.db);
    const r = await acceptInvitation({ rawToken: "x", userId: 1, userEmail: "a@x.com" });
    expect(r).toEqual({ ok: false, reason: "not_pending" });
    expect(h.inserts).toHaveLength(0);
  });

  it("rejects + marks expired when past expiry", async () => {
    const h = makeDb({ id: 5, status: "pending", email: "a@x.com", expiresAt: past, organizationId: 9, role: "member" });
    mockGetDb.mockResolvedValue(h.db);
    const r = await acceptInvitation({ rawToken: "x", userId: 1, userEmail: "a@x.com" });
    expect(r).toEqual({ ok: false, reason: "expired" });
    expect(h.inserts).toHaveLength(0);
    expect(h.updates.some((u) => u.status === "expired")).toBe(true);
  });

  it("rejects when the signed-in email does not match the invited email (no enroll)", async () => {
    const h = makeDb({ id: 5, status: "pending", email: "invited@x.com", expiresAt: future, organizationId: 9, role: "member" });
    mockGetDb.mockResolvedValue(h.db);
    const r = await acceptInvitation({ rawToken: "x", userId: 1, userEmail: "someone-else@x.com" });
    expect(r).toEqual({ ok: false, reason: "email_mismatch" });
    expect(h.inserts).toHaveLength(0);
  });

  it("accepts (case-insensitive email): enrolls the member and consumes the invite", async () => {
    const h = makeDb({ id: 5, status: "pending", email: "invited@x.com", expiresAt: future, organizationId: 9, role: "admin" });
    mockGetDb.mockResolvedValue(h.db);
    const r = await acceptInvitation({ rawToken: "x", userId: 7, userEmail: "Invited@X.com" });
    expect(r).toEqual({ ok: true, organizationId: 9, role: "admin" });
    // Member enrolled with the invited role…
    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0]).toMatchObject({ organizationId: 9, userId: 7, role: "admin" });
    // …and the invite flipped to accepted (single-use).
    expect(h.updates.some((u) => u.status === "accepted")).toBe(true);
  });
});
