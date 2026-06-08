/**
 * LangGraph Postgres Checkpointer
 *
 * Persists LangGraph pipeline state to PostgreSQL so the worker can resume
 * after a crash or restart. Each letter gets its own checkpoint "thread"
 * (thread_id = letterId).
 */
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { createLogger } from "../../logger";
import { normalizeSupabaseUrlForPooler } from "../../_core/supabase-url";

const log = createLogger({ module: "LangGraph:Checkpointer" });

let _checkpointer: PostgresSaver | null = null;

/**
 * Build the checkpointer connection string for Railway's IPv4-only network.
 *
 * `PostgresSaver.fromConnString` opens its OWN pg pool — it does NOT go through
 * the app's `server/db/core.ts` (which already rewrites the IPv6-only direct
 * Supabase host to the pooler). So when `SUPABASE_DIRECT_URL` is the direct host
 * (`db.<ref>.supabase.co` — IPv6-only, unreachable from Railway's IPv4 network),
 * the checkpointer connection fails in <1s and the whole LangGraph pipeline
 * force-fails at startup (observed in prod: letter #74 died 0.7s into
 * `getGraphWithCheckpointer`).
 *
 * Fix: apply the same pooler rewrite the rest of the app uses, then pin
 * `sslmode=no-verify`. The rewrite preserves the existing username/password and
 * only swaps the host to the IPv4 session pooler. We add `sslmode=no-verify`
 * because the pooler requires SSL and node-postgres treats `sslmode=require` as
 * `verify-full` (which fails on Supabase's self-signed chain) — `no-verify`
 * encrypts without verifying, which is what connects successfully against the
 * pooler. (The rewrite helper strips `sslmode` for the app's getPostgresSsl path,
 * so we must re-add it here for PostgresSaver's own connection.)
 */
function buildCheckpointerConnString(raw: string): string {
  let conn = normalizeSupabaseUrlForPooler(raw);
  try {
    const url = new URL(conn);
    if (
      url.hostname.includes("pooler.supabase.com") &&
      url.searchParams.get("sslmode") !== "no-verify"
    ) {
      url.searchParams.set("sslmode", "no-verify");
      conn = url.toString();
    }
  } catch {
    /* unparseable connection string — use as-is */
  }
  return conn;
}

export async function getCheckpointer(): Promise<PostgresSaver> {
  if (_checkpointer) return _checkpointer;

  const rawConnString =
    process.env.SUPABASE_DIRECT_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.DATABASE_URL;

  if (!rawConnString) {
    throw new Error(
      "No database connection string available for LangGraph checkpointer"
    );
  }

  // Rewrite the IPv6-only direct host to the IPv4 pooler + pin sslmode so the
  // checkpointer can actually connect from Railway (see helper above).
  const connString = buildCheckpointerConnString(rawConnString);

  _checkpointer = PostgresSaver.fromConnString(connString);

  // Ensure checkpoint tables exist (checkpoints, checkpoint_writes, etc.)
  await _checkpointer.setup();

  log.info({}, "[LangGraph Checkpointer] PostgresSaver initialized");
  return _checkpointer;
}
