import { ENV } from "./env";

/** Header Anthropic requires when the API key is workspace-wide. */
export const ANTHROPIC_WORKSPACE_HEADER = "anthropic-workspace-id";

/**
 * Extra request headers for every Anthropic call. Returns {} when
 * ANTHROPIC_WORKSPACE_ID is unset, so a key scoped to a single workspace keeps
 * working unchanged. Server-only: the id must never reach the client bundle.
 *
 * Every Anthropic client in the server (SDK, LangChain, Vercel AI SDK, raw
 * fetch) takes its headers from here so the header cannot be forgotten at one
 * call site.
 */
export function anthropicWorkspaceHeaders(): Record<string, string> {
  const workspaceId = (ENV.anthropicWorkspaceId ?? "").trim();
  return workspaceId ? { [ANTHROPIC_WORKSPACE_HEADER]: workspaceId } : {};
}
