/**
 * Manual live smoke test for the Anthropic workspace configuration.
 * NOT part of CI. Run it with the real credentials in the environment:
 *
 *   ANTHROPIC_API_KEY=... ANTHROPIC_WORKSPACE_ID=wrkspc_... \
 *     pnpm exec tsx scripts/anthropic-smoke.ts
 *
 * It lists the models the key can see, then makes one tiny Messages request.
 * It prints only status codes, model ids, stop reason and token counts: never
 * the API key, the workspace id, or any letter content.
 */
import { anthropicWorkspaceHeaders } from "../server/_core/anthropicHeaders";

const API = "https://api.anthropic.com/v1";
const SMOKE_MODEL = process.env.ANTHROPIC_SMOKE_MODEL ?? "claude-haiku-5-5";
const SMOKE_MAX_TOKENS = 16;
const TIMEOUT_MS = 30_000;

function headers(): Record<string, string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set");
    process.exit(1);
  }
  return {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
    ...anthropicWorkspaceHeaders(),
  };
}

async function fail(step: string, res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  console.error(
    `${step} failed: HTTP ${res.status} ${body?.error?.type ?? ""} ${body?.error?.message ?? ""}`.trim()
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const workspaceConfigured = Object.keys(anthropicWorkspaceHeaders()).length > 0;
  console.log(`workspace header: ${workspaceConfigured ? "sent" : "not set"}`);

  const models = await fetch(`${API}/models`, {
    headers: headers(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!models.ok) await fail("GET /v1/models", models);
  const list = (await models.json()) as { data?: Array<{ id: string }> };
  const ids = (list.data ?? []).map(m => m.id);
  console.log(`/v1/models: HTTP ${models.status}, ${ids.length} models visible`);
  console.log(`${SMOKE_MODEL} available: ${ids.includes(SMOKE_MODEL)}`);

  const message = await fetch(`${API}/messages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: SMOKE_MODEL,
      max_tokens: SMOKE_MAX_TOKENS,
      messages: [{ role: "user", content: "Reply with the single word: ready" }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!message.ok) await fail("POST /v1/messages", message);
  const data = (await message.json()) as {
    model: string;
    stop_reason: string;
    usage: { input_tokens: number; output_tokens: number };
  };
  console.log(
    `/v1/messages: HTTP ${message.status}, model ${data.model}, stop_reason ${data.stop_reason}, ` +
      `tokens in ${data.usage.input_tokens} / out ${data.usage.output_tokens}`
  );
}

main().catch(err => {
  console.error(`smoke test error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
