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
