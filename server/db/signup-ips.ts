import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { signupIps, users } from "../../drizzle/schema";
import { getDb } from "./core";

/**
 * Accounts allowed per signup IP. Default 1. Set SIGNUP_ACCOUNTS_PER_IP=0 to
 * disable the check (e.g. if shared office / mobile-carrier IPs cause trouble).
 * Read per call so it can change without a redeploy of code.
 */
export function getSignupAccountsPerIp(): number {
  const raw = process.env.SIGNUP_ACCOUNTS_PER_IP;
  const n = raw === undefined || raw.trim() === "" ? 1 : Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 1;
}

/** Record the IP an account signed up from. Idempotent per user. */
export async function recordSignupIp(input: {
  userId: number;
  ip: string;
  email?: string | null;
  method: "email" | "google";
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(signupIps)
    .values({
      userId: input.userId,
      ip: input.ip,
      email: input.email ?? null,
      method: input.method,
    })
    .onConflictDoNothing({ target: signupIps.userId });
}

/** Number of accounts that signed up from this IP. */
export async function countSignupsFromIp(ip: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(signupIps)
    .where(eq(signupIps.ip, ip));
  return row?.n ?? 0;
}

/**
 * True when another account that signed up from the same IP as `userId` has
 * already claimed its free letter. Closes the gap where a second account is
 * created via Google sign-in (which cannot be refused before Supabase creates
 * the auth user) on a network that already used the offer.
 */
export async function isFreeLetterUsedFromSameIp(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const mine = await db
    .select({ ip: signupIps.ip })
    .from(signupIps)
    .where(eq(signupIps.userId, userId))
    .limit(1);
  const ip = mine[0]?.ip;
  if (!ip) return false;
  const others = await db
    .select({ id: users.id })
    .from(signupIps)
    .innerJoin(users, eq(users.id, signupIps.userId))
    .where(
      and(
        eq(signupIps.ip, ip),
        ne(signupIps.userId, userId),
        isNotNull(users.freeReviewUsedAt)
      )
    )
    .limit(1);
  return others.length > 0;
}
