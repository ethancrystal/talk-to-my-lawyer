import {
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  serial,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { userRoleEnum } from "./constants";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").default("subscriber").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  freeReviewUsedAt: timestamp("free_review_used_at", { withTimezone: true }),
  consentToTraining: boolean("consent_to_training").default(false).notNull(),
  subscriberId: varchar("subscriber_id", { length: 16 }).unique(),
  employeeId: varchar("employee_id", { length: 16 }).unique(),
  attorneyId: varchar("attorney_id", { length: 16 }).unique(),
}, (t) => [
  index("idx_users_email").on(t.email),
  index("idx_users_role").on(t.role),
  index("idx_users_role_active").on(t.role, t.isActive),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// One row per account: the client IP it signed up from. Used to stop one
// network from opening several accounts to farm the first-letter-free offer.
export const signupIps = pgTable("signup_ips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  ip: varchar("ip", { length: 64 }).notNull(),
  email: varchar("email", { length: 320 }),
  method: varchar("method", { length: 16 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_signup_ips_ip").on(t.ip),
]);

export type SignupIp = typeof signupIps.$inferSelect;
