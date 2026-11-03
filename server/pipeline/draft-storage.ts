import { createLogger } from "../logger";
import { getAdminClient } from "../supabaseAuth/client";

const logger = createLogger({ module: "draft-storage" });

/** Private Supabase Storage bucket holding a .txt copy of each AI draft. */
export const DRAFT_BUCKET = "letter-drafts";

/** "letter-7/ai_draft-v12.txt" */
export function draftStoragePath(letterId: number, versionId: number): string {
  return `letter-${letterId}/ai_draft-v${versionId}.txt`;
}

/**
 * Save a plain-text copy of an AI draft to Supabase Storage. The database
 * (letter_versions) stays the source of truth; this is a durable, readable
 * backup. Best effort: any failure is logged and returns null, it never
 * throws, so a Storage problem cannot fail letter generation.
 */
export async function saveDraftToStorage(
  letterId: number,
  versionId: number,
  content: string
): Promise<string | null> {
  const path = draftStoragePath(letterId, versionId);
  try {
    const { error } = await getAdminClient()
      .storage.from(DRAFT_BUCKET)
      .upload(path, Buffer.from(content, "utf-8"), {
        contentType: "text/plain; charset=utf-8",
        upsert: true,
      });
    if (error) {
      logger.warn({ letterId, versionId, err: error.message }, "[DraftStorage] Upload failed (non-fatal)");
      return null;
    }
    logger.info({ letterId, versionId, path }, "[DraftStorage] Draft copy saved");
    return path;
  } catch (err) {
    logger.warn(
      { letterId, versionId, err: err instanceof Error ? err.message : String(err) },
      "[DraftStorage] Upload threw (non-fatal)"
    );
    return null;
  }
}
