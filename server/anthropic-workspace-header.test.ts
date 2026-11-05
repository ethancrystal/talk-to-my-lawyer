import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Capture the options every Anthropic client is built with ───────────────
const chatAnthropicOptions: Array<Record<string, unknown>> = [];
const chatOpenAiOptions: Array<Record<string, unknown>> = [];
const createAnthropicOptions: Array<Record<string, unknown>> = [];
let openAiShouldFail = false;

vi.mock("@langchain/anthropic", () => ({
  ChatAnthropic: class {
    constructor(options: Record<string, unknown>) {
      chatAnthropicOptions.push(options);
    }
    async invoke() {
      return { content: "anthropic draft", usage_metadata: { input_tokens: 3, output_tokens: 5 } };
    }
  },
}));

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    constructor(options: Record<string, unknown>) {
      chatOpenAiOptions.push(options);
    }
    async invoke() {
      if (openAiShouldFail) throw new Error("openai down");
      return { content: "openai draft", usage_metadata: { input_tokens: 2, output_tokens: 4 } };
    }
  },
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: (options: Record<string, unknown>) => {
    createAnthropicOptions.push(options);
    return () => ({});
  },
}));

import { ENV } from "./_core/env";
import {
  ANTHROPIC_WORKSPACE_HEADER,
  anthropicWorkspaceHeaders,
} from "./_core/anthropicHeaders";
import { callLlmWithFailover } from "./pipeline/graph/nodes/llm-failover";
import { getAnthropicClient } from "./pipeline/providers";
import { checkAnthropic } from "./healthCheck";
import { HumanMessage } from "@langchain/core/messages";

const WORKSPACE_ID = "wrkspc_test123";
const callOptions = {
  messages: [new HumanMessage("write a letter")],
  maxTokens: 100,
  timeoutMs: 5_000,
  stage: "draft",
};

const savedEnv = { ...process.env };

beforeEach(() => {
  chatAnthropicOptions.length = 0;
  chatOpenAiOptions.length = 0;
  createAnthropicOptions.length = 0;
  openAiShouldFail = false;
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  process.env.OPENAI_API_KEY = "sk-openai-test";
  delete process.env.ANTHROPIC_WORKSPACE_ID;
});

afterEach(() => {
  process.env = { ...savedEnv };
  vi.unstubAllGlobals();
});

describe("anthropicWorkspaceHeaders", () => {
  it("returns no headers when no workspace id is configured", () => {
    expect(anthropicWorkspaceHeaders()).toEqual({});
  });

  it("returns the workspace header when configured", () => {
    process.env.ANTHROPIC_WORKSPACE_ID = WORKSPACE_ID;
    expect(anthropicWorkspaceHeaders()).toEqual({
      [ANTHROPIC_WORKSPACE_HEADER]: WORKSPACE_ID,
    });
  });

  it("trims whitespace and ignores a blank value", () => {
    process.env.ANTHROPIC_WORKSPACE_ID = `  ${WORKSPACE_ID}  `;
    expect(anthropicWorkspaceHeaders()[ANTHROPIC_WORKSPACE_HEADER]).toBe(WORKSPACE_ID);
    process.env.ANTHROPIC_WORKSPACE_ID = "   ";
    expect(anthropicWorkspaceHeaders()).toEqual({});
  });

  it("is a lazy getter so tests can change the env between cases", () => {
    expect(ENV.anthropicWorkspaceId).toBe("");
    process.env.ANTHROPIC_WORKSPACE_ID = WORKSPACE_ID;
    expect(ENV.anthropicWorkspaceId).toBe(WORKSPACE_ID);
  });
});

describe("LangGraph failover (callLlmWithFailover)", () => {
  it("does not call Anthropic when OpenAI succeeds", async () => {
    process.env.ANTHROPIC_WORKSPACE_ID = WORKSPACE_ID;
    const result = await callLlmWithFailover(callOptions);
    expect(result.provider).toBe("openai");
    expect(chatAnthropicOptions).toHaveLength(0);
  });

  it("sends the workspace header to the Anthropic fallback", async () => {
    openAiShouldFail = true;
    process.env.ANTHROPIC_WORKSPACE_ID = WORKSPACE_ID;
    const result = await callLlmWithFailover(callOptions);
    expect(result.provider).toBe("anthropic");
    expect(chatAnthropicOptions).toHaveLength(1);
    expect(chatAnthropicOptions[0].clientOptions).toEqual({
      defaultHeaders: { [ANTHROPIC_WORKSPACE_HEADER]: WORKSPACE_ID },
    });
  });

  it("adds no clientOptions when no workspace id is set (scoped key)", async () => {
    openAiShouldFail = true;
    await callLlmWithFailover(callOptions);
    expect(chatAnthropicOptions).toHaveLength(1);
    expect(chatAnthropicOptions[0]).not.toHaveProperty("clientOptions");
  });

  it("keeps the existing error when the Anthropic key is missing", async () => {
    openAiShouldFail = true;
    delete process.env.ANTHROPIC_API_KEY;
    await expect(callLlmWithFailover(callOptions)).rejects.toThrow(
      /ANTHROPIC_API_KEY not set/
    );
  });
});

describe("Vercel AI SDK client (providers.getAnthropicClient)", () => {
  it("passes the workspace header when configured", () => {
    process.env.ANTHROPIC_WORKSPACE_ID = WORKSPACE_ID;
    getAnthropicClient();
    expect(createAnthropicOptions[0].headers).toEqual({
      [ANTHROPIC_WORKSPACE_HEADER]: WORKSPACE_ID,
    });
  });

  it("passes empty headers when not configured", () => {
    getAnthropicClient();
    expect(createAnthropicOptions[0].headers).toEqual({});
  });
});

describe("health check (checkAnthropic)", () => {
  function stubFetch(status: number) {
    const fetchMock = vi.fn().mockResolvedValue({ ok: status < 400, status });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("is unconfigured only when the API key is absent", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await checkAnthropic();
    expect(result.status).toBe("unconfigured");
  });

  it("sends the workspace header to /v1/models and reports ok", async () => {
    process.env.ANTHROPIC_WORKSPACE_ID = WORKSPACE_ID;
    const fetchMock = stubFetch(200);
    const result = await checkAnthropic();
    expect(result.status).toBe("ok");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/models");
    expect(init.headers).toMatchObject({
      "x-api-key": "sk-ant-test",
      [ANTHROPIC_WORKSPACE_HEADER]: WORKSPACE_ID,
    });
  });

  it("omits the header when no workspace id is set", async () => {
    const fetchMock = stubFetch(200);
    await checkAnthropic();
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty(
      ANTHROPIC_WORKSPACE_HEADER
    );
  });

  it("reports an error when the key or workspace is rejected", async () => {
    stubFetch(401);
    const result = await checkAnthropic();
    expect(result.status).toBe("error");
  });
});

describe("Supabase edge function (claude-letter)", () => {
  const EDGE_TOKEN = "edge-token";
  type Handler = (req: Request) => Promise<Response>;

  async function loadHandler(secrets: Record<string, string>): Promise<Handler> {
    let handler: Handler | undefined;
    vi.stubGlobal("Deno", {
      serve: (fn: Handler) => {
        handler = fn;
      },
      env: { get: (name: string) => secrets[name] },
    });
    vi.resetModules();
    await import("../supabase/functions/claude-letter/index");
    if (!handler) throw new Error("edge function did not register a handler");
    return handler;
  }

  function request() {
    return new Request("https://edge.test/claude-letter", {
      method: "POST",
      headers: { authorization: `Bearer ${EDGE_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ system: "sys", prompt: "hello" }),
    });
  }

  function stubAnthropic() {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ content: [{ type: "text", text: "letter" }], usage: {} }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("sends anthropic-workspace-id when the secret is set", async () => {
    const fetchMock = stubAnthropic();
    const handler = await loadHandler({
      ANTHROPIC_API_KEY: "sk-ant-test",
      ANTHROPIC_WORKSPACE_ID: WORKSPACE_ID,
      LETTER_EDGE_TOKEN: EDGE_TOKEN,
    });
    const res = await handler(request());
    expect(res.status).toBe(200);
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers["anthropic-workspace-id"]).toBe(WORKSPACE_ID);
    expect(headers["x-api-key"]).toBe("sk-ant-test");
  });

  it("omits the header when the secret is not set", async () => {
    const fetchMock = stubAnthropic();
    const handler = await loadHandler({
      ANTHROPIC_API_KEY: "sk-ant-test",
      LETTER_EDGE_TOKEN: EDGE_TOKEN,
    });
    await handler(request());
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty(
      "anthropic-workspace-id"
    );
  });
});
