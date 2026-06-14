import { and, eq, sql } from "drizzle-orm";
import {
  organizations,
  organizationMembers,
  users,
  type Organization,
  type OrganizationMember,
  type OrganizationMemberRole,
} from "../../drizzle/schema";
import { getDb } from "./core";

// ═══════════════════════════════════════════════════════
// ORGANIZATION / TEAM DATA ACCESS
//
// Foundation for B2B team accounts (see docs/GROWTH_STRATEGY.md). Additive and
// non-breaking: a user with no membership row is a solo account. Routers must
// import these functions rather than writing raw Drizzle (repo convention).
//
// Deliberately NOT yet wired into the live entitlement/letter flow — that
// rewiring builds on top of resolveUserLetterScope() below. Until then existing
// per-user behavior is unchanged.
// ═══════════════════════════════════════════════════════

export interface OrganizationWithRole extends Organization {
  /** The caller's role within this organization. */
  memberRole: OrganizationMemberRole;
}

/**
 * Create an organization and enroll the owner as its first member (role:
 * "owner"). Runs in a transaction so an org never exists without its owner.
 */
export async function createOrganization(input: {
  name: string;
  ownerId: number;
  plan?: string | null;
  seatsAllowed?: number;
  stripeCustomerId?: string | null;
}): Promise<Organization> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async (tx: any) => {
    const [org] = await tx
      .insert(organizations)
      .values({
        name: input.name,
        ownerId: input.ownerId,
        plan: input.plan ?? null,
        seatsAllowed: input.seatsAllowed ?? 1,
        stripeCustomerId: input.stripeCustomerId ?? null,
      })
      .returning();

    await tx
      .insert(organizationMembers)
      .values({
        organizationId: org.id,
        userId: input.ownerId,
        role: "owner",
      })
      .onConflictDoNothing();

    return org as Organization;
  });
}

/**
 * Add (or no-op if already present) a member to an organization. The
 * (organizationId, userId) unique index makes this idempotent.
 */
export async function addOrganizationMember(input: {
  organizationId: number;
  userId: number;
  role?: OrganizationMemberRole;
}): Promise<OrganizationMember | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [member] = await db
    .insert(organizationMembers)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.role ?? "member",
    })
    .onConflictDoNothing()
    .returning();

  return member ?? null;
}

/** Remove a member from an organization. */
export async function removeOrganizationMember(
  organizationId: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId)
      )
    );
}

/** Fetch an organization by id, or null if not found. */
export async function getOrganizationById(
  id: number
): Promise<Organization | null> {
  const db = await getDb();
  if (!db) return null;
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);
  return org ?? null;
}

/**
 * Return the organization a user belongs to (with their role), or null if the
 * user is a solo account. A user is expected to belong to at most one org in
 * this foundation; if multiple memberships exist, the owner row (then the
 * earliest) wins deterministically.
 */
export async function getOrganizationForUser(
  userId: number
): Promise<OrganizationWithRole | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select({
      org: organizations,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id)
    )
    .where(eq(organizationMembers.userId, userId));

  if (rows.length === 0) return null;

  // Deterministic pick: prefer the org the user owns, else the lowest org id.
  const sorted = [...rows].sort((a: any, b: any) => {
    if (a.role === "owner" && b.role !== "owner") return -1;
    if (b.role === "owner" && a.role !== "owner") return 1;
    return a.org.id - b.org.id;
  });
  const chosen = sorted[0];
  return { ...(chosen.org as Organization), memberRole: chosen.role as OrganizationMemberRole };
}

/** List all members of an organization, joined to their user record. */
export async function getOrganizationMembers(organizationId: number): Promise<
  Array<{
    userId: number;
    role: OrganizationMemberRole;
    name: string | null;
    email: string | null;
  }>
> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      userId: organizationMembers.userId,
      role: organizationMembers.role,
      name: users.name,
      email: users.email,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, organizationId));

  return rows.map((r: any) => ({
    userId: r.userId,
    role: r.role as OrganizationMemberRole,
    name: r.name,
    email: r.email,
  }));
}

export interface LetterScope {
  /** "organization" when the user draws from a shared org pool; else "user". */
  kind: "organization" | "user";
  organizationId: number | null;
  organizationRole: OrganizationMemberRole | null;
  /** Pool capacity when kind === "organization" (else null — use the user's subscription). */
  lettersAllowed: number | null;
  lettersUsed: number | null;
}

/**
 * Resolve which entitlement pool a user draws from.
 *
 * This is the seam future entitlement code uses to pool letters at the org
 * level: if the user belongs to an org, letters come from the org's shared
 * allowance; otherwise the caller falls back to the user's own subscription
 * (current behavior). Returning a discriminated scope keeps the rewiring
 * localized and testable rather than scattering org-vs-user branches.
 */
export async function resolveUserLetterScope(userId: number): Promise<LetterScope> {
  const org = await getOrganizationForUser(userId);
  if (!org) {
    return {
      kind: "user",
      organizationId: null,
      organizationRole: null,
      lettersAllowed: null,
      lettersUsed: null,
    };
  }
  return {
    kind: "organization",
    organizationId: org.id,
    organizationRole: org.memberRole,
    lettersAllowed: org.lettersAllowed,
    lettersUsed: org.lettersUsed,
  };
}

/**
 * Atomically consume one letter from an organization's shared pool. Returns the
 * updated row when a letter was available, or null when the pool is exhausted —
 * the conditional UPDATE (lettersUsed < lettersAllowed) prevents over-spend
 * under concurrency, mirroring the per-user incrementLettersUsed pattern.
 */
export async function consumeOrganizationLetter(
  organizationId: number
): Promise<Organization | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [updated] = await db
    .update(organizations)
    .set({
      lettersUsed: sql`${organizations.lettersUsed} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(organizations.id, organizationId),
        sql`${organizations.lettersUsed} < ${organizations.lettersAllowed}`
      )
    )
    .returning();

  return updated ?? null;
}

/**
 * Refund one letter to an organization's shared pool (e.g. after a pipeline
 * failure). Mirrors the per-user decrementLettersUsed: clamps at 0 so a refund
 * can never push the pool negative.
 */
export async function refundOrganizationLetter(
  organizationId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(organizations)
    .set({
      lettersUsed: sql`GREATEST(${organizations.lettersUsed} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));
}
