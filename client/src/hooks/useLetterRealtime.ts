import { useEffect, useRef, useCallback } from "react";
import { getOrCreateChannel, removeChannel } from "@/lib/supabase";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type LetterRealtimeEvent = {
  letterId: number;
  oldStatus: string;
  newStatus: string;
  updatedAt: string;
};

type UseLetterRealtimeOptions = {
  /** Letter ID to watch. Pass null/undefined to disable. */
  letterId?: number | null;
  /** Called when the letter's status changes. */
  onStatusChange: (event: LetterRealtimeEvent) => void;
  /** Whether the subscription is enabled. Defaults to true. */
  enabled?: boolean;
};

// ─── Hook: useLetterRealtime ───────────────────────────────────────────────────
// Subscribes to Supabase Realtime changes on a specific letter_requests row.
// Falls back gracefully if Supabase is not configured (VITE_SUPABASE_URL missing).

export function useLetterRealtime({
  letterId,
  onStatusChange,
  enabled = true,
}: UseLetterRealtimeOptions): void {
  const callbackRef = useRef(onStatusChange);
  callbackRef.current = onStatusChange;

  useEffect(() => {
    if (!enabled || !letterId) return;

    const channelKey = `letter-${letterId}`;

    const channel = getOrCreateChannel(channelKey, (client) =>
      client
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "letter_requests",
            filter: `id=eq.${letterId}`,
          },
          (payload) => {
            const oldRecord = payload.old as Record<string, unknown>;
            const newRecord = payload.new as Record<string, unknown>;
            if (oldRecord?.status !== newRecord?.status) {
              callbackRef.current({
                letterId,
                oldStatus: String(oldRecord?.status ?? ""),
                newStatus: String(newRecord?.status ?? ""),
                updatedAt: String(newRecord?.updated_at ?? new Date().toISOString()),
              });
            }
          }
        )
        .subscribe()
    );

    if (!channel) return; // Supabase not configured, polling handles it

    return () => {
      removeChannel(channelKey);
    };
  }, [letterId, enabled]);
}

// ─── Hook: useLetterListRealtime ───────────────────────────────────────────────
// Subscribes to any change in letter_requests for a given user.
// Used on Dashboard and MyLetters pages to detect when any letter changes.

type UseLetterListRealtimeOptions = {
  userId?: number | null;
  onAnyChange: () => void;
  enabled?: boolean;
};

export function useLetterListRealtime({
  userId,
  onAnyChange,
  enabled = true,
}: UseLetterListRealtimeOptions): void {
  const callbackRef = useRef(onAnyChange);
  callbackRef.current = onAnyChange;

  useEffect(() => {
    if (!enabled || !userId) return;

    const channelKey = `letters-user-${userId}`;

    const channel = getOrCreateChannel(channelKey, (client) =>
      client
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "letter_requests",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            callbackRef.current();
          }
        )
        .subscribe()
    );

    if (!channel) return;

    return () => {
      removeChannel(channelKey);
    };
  }, [userId, enabled]);
}

// ─── Hook: useReviewQueueRealtime ──────────────────────────────────────────────
// Subscribes to any letter_requests change for the employee review queue.
// Triggers a refetch whenever any letter status changes.

type UseReviewQueueRealtimeOptions = {
  onAnyChange: () => void;
  enabled?: boolean;
};

export function useReviewQueueRealtime({
  onAnyChange,
  enabled = true,
}: UseReviewQueueRealtimeOptions): void {
  const callbackRef = useRef(onAnyChange);
  callbackRef.current = onAnyChange;

  const stableCallback = useCallback(() => {
    callbackRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const channelKey = "review-queue-global";

    const channel = getOrCreateChannel(channelKey, (client) =>
      client
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "letter_requests",
          },
          stableCallback
        )
        .subscribe()
    );

    if (!channel) return;

    return () => {
      removeChannel(channelKey);
    };
  }, [enabled, stableCallback]);
}

// ─── Hook: useNotificationsRealtime ────────────────────────────────────────────
// Subscribes to INSERT / UPDATE / DELETE on public.notifications for a given
// user_id. Fires `onAnyChange` on every event so the caller can invalidate the
// trpc.notifications.list query cache.
//
// ⚠️  KNOWN GAP — currently delivers ZERO events:
//   - client/src/lib/supabase.ts creates the Supabase client with the anon
//     key only and never calls `supabase.realtime.setAuth(jwt)`. The
//     websocket connects unauthenticated.
//   - The `notifications_select_own` RLS policy gates SELECT on
//     `public.app_user_id()`, which reads `current_setting('app.current_user_id')`
//     — a session GUC set per tRPC request via `SET LOCAL`, never set on
//     Realtime's separate Postgres connection.
//   - Net effect: every postgres_changes row fails RLS at the publication
//     layer, and the browser never sees an event.
//
// The hook is left in place (and a no-op in this state) so the wire-up is
// already done when one of these fixes lands:
//   (a) Set the JWT on the Realtime client (`client.realtime.setAuth(jwt)`)
//       AND add an alternate RLS policy that bridges `auth.uid()` (UUID) to
//       `users.id` (integer), OR
//   (b) Migrate to broadcast + private channels driven by a DB trigger
//       (`realtime.broadcast_changes()` from a per-row notifications trigger),
//       which sidesteps the RLS-via-replication path entirely.
//
// Until one of those is shipped, callers MUST keep a refetchInterval that
// covers their freshness target — see NotificationsPanel.tsx for an example.

type UseNotificationsRealtimeOptions = {
  /** Local public.users.id (integer). Pass null to disable. */
  userId?: number | null;
  /** Called when any notification row for this user is inserted/updated/deleted. */
  onAnyChange: () => void;
  /** Whether the subscription is enabled. Defaults to true. */
  enabled?: boolean;
};

export function useNotificationsRealtime({
  userId,
  onAnyChange,
  enabled = true,
}: UseNotificationsRealtimeOptions): void {
  const callbackRef = useRef(onAnyChange);
  callbackRef.current = onAnyChange;

  const stableCallback = useCallback(() => {
    callbackRef.current();
  }, []);

  useEffect(() => {
    if (!enabled || !userId) return;

    const channelKey = `notifications-user-${userId}`;

    const channel = getOrCreateChannel(channelKey, (client) =>
      client
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "*", // INSERT, UPDATE, DELETE
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          stableCallback
        )
        .subscribe()
    );

    if (!channel) return; // Supabase not configured — polling fallback covers it.

    return () => {
      removeChannel(channelKey);
    };
  }, [userId, enabled, stableCallback]);
}
