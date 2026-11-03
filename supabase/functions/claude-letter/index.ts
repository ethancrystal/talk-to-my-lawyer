// Supabase Edge Function: runs the Claude call for letter generation.
//
// The app (Vercel) keeps the status machine, saved versions and audit trail;
// this function only turns {system, prompt} into letter text so the Anthropic
// key and the long-running call live on Supabase.
//
// Secrets (Supabase dashboard -> Edge Functions -> Secrets):
//   ANTHROPIC_API_KEY   the Anthropic key
//   LETTER_EDGE_TOKEN   shared bearer token, same value as the app's env var
//
// Deployed with verify_jwt=false because it authenticates with
// LETTER_EDGE_TOKEN itself.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5-20250929";
// A finished letter is ~300-600 words; the cap bounds latency and cost.
const MAX_TOKENS = 2000;
// Low temperature keeps the draft close to the supplied facts.
const TEMPERATURE = 0.2;
// Supabase edge requests are cut at 150s; stay well inside, and inside the
// app's 3 minute generation budget.
const CLAUDE_TIMEOUT_MS = 100_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Constant-time string compare so the token can't be guessed from timing.
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("LETTER_EDGE_TOKEN");
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!expected || !apiKey) {
    return json({ error: "Function not configured" }, 503);
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!safeEqual(token, expected)) return json({ error: "Unauthorized" }, 401);

  let system = "";
  let prompt = "";
  try {
    const body = await req.json();
    system = typeof body.system === "string" ? body.system : "";
    prompt = typeof body.prompt === "string" ? body.prompt : "";
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!prompt) return json({ error: "prompt is required" }, 400);

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        // Same ephemeral cache tag the app uses, so repeated letters within
        // 5 minutes read the cached system prompt at ~10% of the price.
        system: system
          ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }]
          : undefined,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS),
    });

    const data = await res.json();
    if (!res.ok) {
      return json(
        { error: data?.error?.message ?? `Anthropic returned ${res.status}` },
        502
      );
    }

    const content =
      data.content?.[0]?.type === "text" ? data.content[0].text : "";
    if (!content) return json({ error: "Empty completion" }, 502);

    return json({ content, model: MODEL, usage: data.usage ?? {} });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    return json(
      { error: timedOut ? "Claude request timed out" : String(err) },
      timedOut ? 504 : 502
    );
  }
});
