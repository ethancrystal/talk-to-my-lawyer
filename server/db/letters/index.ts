export * from "./query";
export * from "./mutations";
export * from "./utils";

import { and, eq, isNull, asc, desc } from "drizzle-orm";
import { letterRequests } from "../../../drizzle/schema";
import { getDb } from "../core";

type LetterRequestRow = typeof letterRequests.$inferSelect;

export async function getAllLetterRequests(filters?: {
    status?: string;
    assignedReviewerId?: number | null;
    unassigned?: boolean;
    orderDirection?: "asc" | "desc";
    /**
     * Optional pagination — when set, limits the result set.
     *
     * When unset, returns all matching rows. The unbounded default is preserved
     * for backward-compatibility with internal callers that count results
     * (e.g. `updateRole` notifying a newly-promoted attorney of N pending letters),
     * but every caller that exposes results to a user — admin dashboards, the
     * attorney review queue — should pass an explicit `limit` to prevent the
     * tail-latency / memory blow-up as `letter_requests` grows.
     */
    limit?: number;
    offset?: number;
}): Promise<LetterRequestRow[]> {
    const db = await getDb();
    if (!db) return [];
    const conditions = [];
    if (filters?.status)
        conditions.push(eq(letterRequests.status, filters.status as any));
    if (filters?.unassigned)
        conditions.push(isNull(letterRequests.assignedReviewerId));
    else if (
        filters?.assignedReviewerId !== undefined &&
        filters.assignedReviewerId !== null
    )
        conditions.push(
            eq(letterRequests.assignedReviewerId, filters.assignedReviewerId)
        );
    // Tiebreaker sort by `id` ensures deterministic ordering across pages when
    // multiple rows share the same `createdAt` — without it, offset-based
    // pagination could yield duplicate or missing rows across boundaries.
    const dir = filters?.orderDirection === "asc" ? asc : desc;
    // Drizzle's chainable builder returns a narrower type at each step; the
    // intermediate `any` is contained, but the function's explicit
    // `Promise<LetterRequestRow[]>` return type ensures callers (including
    // tRPC's type inference) see the correct row shape.
    let query: any = db
        .select()
        .from(letterRequests)
        .orderBy(dir(letterRequests.createdAt), dir(letterRequests.id));
    if (conditions.length > 0) query = query.where(and(...conditions));
    if (filters?.limit !== undefined) query = query.limit(filters.limit);
    if (filters?.offset !== undefined) query = query.offset(filters.offset);
    return query as Promise<LetterRequestRow[]>;
}
