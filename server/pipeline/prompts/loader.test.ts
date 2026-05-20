/**
 * loader.ts — behavioral tests.
 *
 * Why these tests exist:
 *   Prompt markdown files used to ship inside the source tree but never made
 *   it into the Docker production image, so `loadPrompt()` failed with a
 *   generic ENOENT that the orchestrator mistook for a transient error and
 *   retried until letters timed out. The hardened loader probes several known
 *   runtime locations and throws a typed BUILD_ARTIFACT_MISSING error when
 *   none match. These tests pin both the fallback chain and the Dockerfile
 *   COPY that puts the files in one of those locations.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPrompt, getPromptCandidateDirs } from "./loader";
import {
  PIPELINE_ERROR_CATEGORY,
  PIPELINE_ERROR_CODES,
  PipelineError,
} from "../../../shared/types/pipeline";

// This test file lives at server/pipeline/prompts/loader.test.ts.
// The Dockerfile lives at the repo root — 3 levels up.
const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".."
);

describe("loadPrompt — happy path (tsx/dev: __dirname holds the markdown)", () => {
  it("returns non-empty content for an existing prompt template", () => {
    const text = loadPrompt("research-system.md");
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });

  it("substitutes {{variable}} placeholders in the loaded content", () => {
    // research-user.md contains placeholders like {{letterType}}, {{jurisdiction}}.
    const out = loadPrompt("research-user.md", {
      letterType: "DEMAND_LETTER",
      jurisdiction: "California, US",
      subject: "Test subject",
      description: "Test description",
      incidentDate: "2026-01-01",
      amountOwed: "1000",
      desiredOutcome: "Refund",
      additionalContext: "None",
      evidenceSummary: "None",
      situationFields: "None",
    });
    expect(out).toContain("DEMAND_LETTER");
    expect(out).toContain("California, US");
    expect(out).not.toMatch(/\{\{letterType\}\}/);
  });
});

describe("loadPrompt — fallback chain probes multiple candidate directories", () => {
  let readSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    readSpy = null;
  });

  afterEach(() => {
    readSpy?.mockRestore();
    readSpy = null;
  });

  it("succeeds on the 3rd candidate when the first two ENOENT", () => {
    const dirs = getPromptCandidateDirs();
    // Should always return at least the documented 5 candidates.
    expect(dirs.length).toBeGreaterThanOrEqual(5);

    const targetIndex = 2;
    const targetPath = path.join(dirs[targetIndex], "research-system.md");
    const expected = "SUCCESS_FROM_FALLBACK_PATH_3";

    readSpy = vi.spyOn(fs, "readFileSync").mockImplementation((p: any) => {
      if (p === targetPath) return expected;
      const err = new Error(`ENOENT: no such file or directory, open '${p}'`);
      (err as NodeJS.ErrnoException).code = "ENOENT";
      throw err;
    });

    expect(loadPrompt("research-system.md")).toBe(expected);
  });

  it("returns the FIRST candidate that exists, not a later one", () => {
    const dirs = getPromptCandidateDirs();
    const firstPath = path.join(dirs[0], "research-system.md");
    const thirdPath = path.join(dirs[2], "research-system.md");

    readSpy = vi.spyOn(fs, "readFileSync").mockImplementation((p: any) => {
      if (p === firstPath) return "FIRST";
      if (p === thirdPath) return "THIRD";
      const err = new Error(`ENOENT: no such file or directory, open '${p}'`);
      (err as NodeJS.ErrnoException).code = "ENOENT";
      throw err;
    });

    expect(loadPrompt("research-system.md")).toBe("FIRST");
  });
});

describe("loadPrompt — typed permanent failure when no candidate exists", () => {
  let readSpy: ReturnType<typeof vi.spyOn> | null = null;

  afterEach(() => {
    readSpy?.mockRestore();
    readSpy = null;
  });

  it("throws a PipelineError with code BUILD_ARTIFACT_MISSING and stage 'prompt_loader'", () => {
    readSpy = vi.spyOn(fs, "readFileSync").mockImplementation((p: any) => {
      const err = new Error(`ENOENT: no such file or directory, open '${p}'`);
      (err as NodeJS.ErrnoException).code = "ENOENT";
      throw err;
    });

    let thrown: unknown = null;
    try {
      loadPrompt("research-system.md");
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(PipelineError);
    const err = thrown as PipelineError;
    expect(err.code).toBe(PIPELINE_ERROR_CODES.BUILD_ARTIFACT_MISSING);
    expect(err.stage).toBe("prompt_loader");
  });

  it("is classified as a permanent error (so orchestrator does not retry)", () => {
    readSpy = vi.spyOn(fs, "readFileSync").mockImplementation((p: any) => {
      const err = new Error(`ENOENT: no such file or directory, open '${p}'`);
      (err as NodeJS.ErrnoException).code = "ENOENT";
      throw err;
    });

    try {
      loadPrompt("research-system.md");
      throw new Error("expected loadPrompt to throw");
    } catch (e) {
      const err = e as PipelineError;
      expect(err.category).toBe("permanent");
      expect(
        PIPELINE_ERROR_CATEGORY[PIPELINE_ERROR_CODES.BUILD_ARTIFACT_MISSING]
      ).toBe("permanent");
    }
  });

  it("the error details list every path the loader probed", () => {
    readSpy = vi.spyOn(fs, "readFileSync").mockImplementation((p: any) => {
      const err = new Error(`ENOENT: no such file or directory, open '${p}'`);
      (err as NodeJS.ErrnoException).code = "ENOENT";
      throw err;
    });

    try {
      loadPrompt("research-system.md");
      throw new Error("expected loadPrompt to throw");
    } catch (e) {
      const err = e as PipelineError;
      const candidates = getPromptCandidateDirs();
      for (const dir of candidates) {
        const expectedPath = path.join(dir, "research-system.md");
        expect(err.details, `details should mention ${expectedPath}`).toContain(
          expectedPath
        );
      }
    }
  });
});

describe("loadPrompt — refuses non-basename paths (path traversal guard)", () => {
  it("throws BUILD_ARTIFACT_MISSING without reading any file when given '..' traversal", () => {
    const readSpy = vi.spyOn(fs, "readFileSync");
    try {
      expect(() => loadPrompt("../etc/passwd")).toThrow(PipelineError);
      expect(readSpy).not.toHaveBeenCalled();
    } finally {
      readSpy.mockRestore();
    }
  });

  it("rejects forward-slash subpaths", () => {
    expect(() => loadPrompt("subdir/file.md")).toThrowError(PipelineError);
  });

  it("rejects empty filenames", () => {
    expect(() => loadPrompt("")).toThrowError(PipelineError);
  });
});

describe("Dockerfile ships prompt markdown into the runtime image", () => {
  // This guard exists because the original production incident was a missing
  // COPY in the Dockerfile, not a code bug. Deleting either COPY line should
  // turn this test red so a future agent cannot silently re-introduce the
  // failure mode by reformatting the Dockerfile.
  it("contains a COPY for /app/server/pipeline/prompts/ → ./server/pipeline/prompts/", () => {
    const dockerfile = fs.readFileSync(
      path.join(REPO_ROOT, "Dockerfile"),
      "utf-8"
    );
    expect(dockerfile).toContain(
      "COPY --from=builder /app/server/pipeline/prompts/ ./server/pipeline/prompts/"
    );
  });

  it("contains a COPY for /app/server/pipeline/prompts/ → ./dist/prompts/ (belt-and-suspenders)", () => {
    const dockerfile = fs.readFileSync(
      path.join(REPO_ROOT, "Dockerfile"),
      "utf-8"
    );
    expect(dockerfile).toContain(
      "COPY --from=builder /app/server/pipeline/prompts/ ./dist/prompts/"
    );
  });
});
