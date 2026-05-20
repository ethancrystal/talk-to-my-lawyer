import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PIPELINE_ERROR_CODES,
  PipelineError,
} from "../../../shared/types/pipeline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Candidate directories searched in order for prompt markdown files at runtime.
 *
 * Dev (tsx): __dirname resolves to <repo>/server/pipeline/prompts, so the first
 * entry hits and no fallbacks fire. Production (esbuild bundle): __dirname
 * resolves to /app/dist, so the source-tree copy at /app/server/pipeline/prompts
 * (path #5) or the colocated /app/dist/prompts (path #2) is what we hit,
 * depending on which Dockerfile COPY landed first.
 *
 * If you add a path here, also update server/pipeline/prompts/loader.test.ts.
 */
function candidateDirs(): string[] {
  const cwd = process.cwd();
  return [
    __dirname,
    path.join(__dirname, "prompts"),
    path.join(cwd, "dist"),
    path.join(cwd, "dist", "prompts"),
    path.join(cwd, "server", "pipeline", "prompts"),
  ];
}

function assertBasename(filename: string): void {
  if (!filename || filename !== path.basename(filename)) {
    throw new PipelineError(
      PIPELINE_ERROR_CODES.BUILD_ARTIFACT_MISSING,
      `Invalid prompt filename: must be a basename, got "${filename}"`,
      "prompt_loader",
      "filename contained a path separator or traversal segment"
    );
  }
}

function readFromCandidates(filename: string): string {
  const triedPaths: string[] = [];
  for (const dir of candidateDirs()) {
    const filePath = path.join(dir, filename);
    triedPaths.push(filePath);
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | undefined)?.code;
      if (code === "ENOENT" || code === "ENOTDIR") continue;
      throw err;
    }
  }
  throw new PipelineError(
    PIPELINE_ERROR_CODES.BUILD_ARTIFACT_MISSING,
    `Prompt asset "${filename}" not found in any known runtime location. ` +
      `This usually means the Dockerfile did not COPY server/pipeline/prompts/ into the production image.`,
    "prompt_loader",
    `Paths tried: ${triedPaths.join("; ")}`
  );
}

/**
 * Load a markdown prompt template and substitute {{variable}} placeholders.
 *
 * In production the source-tree markdown files do not live next to the esbuild
 * bundle, so the loader probes several known runtime locations and throws a
 * typed PipelineError(BUILD_ARTIFACT_MISSING) listing every path tried when
 * none match. Permanent (non-transient) by classification so the orchestrator
 * fails fast instead of retrying identical work.
 */
export function loadPrompt(
  filename: string,
  variables: Record<
    string,
    string | number | boolean | null | undefined
  > = {}
): string {
  assertBasename(filename);

  let content = readFromCandidates(filename);

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, "g");
    content = content.replace(placeholder, String(value ?? "Not specified"));
  }

  return content.trim();
}

/** Exposed for tests — list of candidate directories the loader probes. */
export function getPromptCandidateDirs(): string[] {
  return candidateDirs();
}
