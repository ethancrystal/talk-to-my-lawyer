import {
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
  jsonb,
  serial,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

// ═══════════════════════════════════════════════════════
// B2B / TEAM ACCOUNTS — foundation
//
// This is the additive foundation for organization/team accounts (the #1 B2B
// revenue unlock — see docs/GROWTH_STRATEGY.md). It is intentionally
// non-breaking: two NEW tables only, no ALTER to users / letter_requests /
// subscriptions. Existing single-user accounts are unaffected — a user with no
// organization_members row is simply a solo account (an implicit "org of one").
//
// The deeper wiring (pooling entitlement at the org level, seat-based Stripe
// billing, the org admin console) builds on top of this without further schema
// churn to the hot tables. The DAL in server/db/organizations.ts exposes the
// resolver that future entitlement code uses.
// ═══════════════════════════════════════════════════════

/** Roles a user can hold within an organization. */
export const ORGANIZATION_MEMBER_ROLES = ["owner", "admin", "member"] as const;
export type OrganizationMemberRole = (typeof ORGANIZATION_MEMBER_ROLES)[number];

// ─── TABLE: organizations ───────────────────────────────────────────────────
// A team/firm account that owns a shared pool of letters and seats. Billing is
// attached at the org level (stripeCustomerId) for seat-based subscriptions.
export const organizations = pgTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    // The user who created/owns the org. set null on user deletion so the org
    // row survives (ownership can be reassigned) rather than cascading away.
    ownerId: integer("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    // The active Stripe subscription id for this org's seat plan. Needed to
    // adjust seat quantity (with proration) when a member is added beyond the
    // current paid seats. Nullable/back-filled: the provisioning webhook sets it
    // on subscription create/update; legacy rows fill in on their next event.
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    // Seat-based plan name (nullable until the org subscribes). The canonical
    // plan catalog lives in shared/pricing.ts; this is the org's chosen plan id.
    plan: varchar("plan", { length: 64 }),
    seatsAllowed: integer("seats_allowed").default(1).notNull(),
    // Shared letter pool, mirroring the per-user subscriptions columns so the
    // entitlement resolver can treat an org pool the same way it treats a solo
    // subscription. Never use a "remaining" column — always allowed/used.
    lettersAllowed: integer("letters_allowed").default(0).notNull(),
    lettersUsed: integer("letters_used").default(0).notNull(),
    metadataJson: jsonb("metadata_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_organizations_owner_id").on(t.ownerId),
    index("idx_organizations_stripe_customer_id").on(t.stripeCustomerId),
  ]
);

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ─── TABLE: organization_members ────────────────────────────────────────────
// Join table: which users belong to which org, and with what role. A user
// appears at most once per org (uniqueIndex). Cascades on both sides so removing
// an org or a user cleanly removes the membership.
export const organizationMembers = pgTable(
  "organization_members",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).default("member").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_organization_members_org_user").on(t.organizationId, t.userId),
    index("idx_organization_members_user_id").on(t.userId),
    index("idx_organization_members_org_id").on(t.organizationId),
  ]
);

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = typeof organizationMembers.$inferInsert;

// ─── TABLE: organization_invitations ────────────────────────────────────────
// Pending email invitations to join an org. Lets an admin invite someone who
// does NOT yet have a TTML account: the invitee receives an emailed link, signs
// up / logs in, and is auto-joined. The raw token is emailed; only its SHA-256
// HASH is stored here (so a DB leak can't be used to accept invites). Bound to
// the invited email, single-use, time-limited.
export const ORGANIZATION_INVITATION_STATUSES = [
  "pending",
  "accepted",
  "revoked",
  "expired",
] as const;
export type OrganizationInvitationStatus =
  (typeof ORGANIZATION_INVITATION_STATUSES)[number];

export const organizationInvitations = pgTable(
  "organization_invitations",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Invited email (stored lowercased by the DAL). Acceptance requires the
    // authenticated user's email to match this.
    email: varchar("email", { length: 320 }).notNull(),
    // SHA-256 hash of the single-use token; the raw token only lives in the link.
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    role: varchar("role", { length: 32 }).default("member").notNull(),
    invitedByUserId: integer("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 16 }).default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (t) => [
    // Fast lookup on acceptance.
    index("idx_org_invitations_token_hash").on(t.tokenHash),
    index("idx_org_invitations_org_id").on(t.organizationId),
    // At most one PENDING invite per (org, email) — prevents duplicate live
    // invites while still allowing re-invite after accept/revoke/expire.
    uniqueIndex("uq_org_invitations_pending")
      .on(t.organizationId, t.email)
      .where(sql`${t.status} = 'pending'`),
  ]
);

export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
export type InsertOrganizationInvitation =
  typeof organizationInvitations.$inferInsert;
