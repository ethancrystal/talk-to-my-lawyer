export const DEFAULT_DRAFT_PREVIEW_WINDOW_SECONDS = 24 * 60 * 60;

export type DraftPreviewGateInput = {
  /**
   * True only for first-time/free-trial users. Does not control the timing of
   * the 24h gate, but DOES control the fail-closed default when the
   * visibility timestamp is missing (see isDraftPreviewUnlocked).
   */
  isFreeTrialPreview?: boolean | null | undefined;
  /** Backward-compatible DB field used as the generic draft visibility timestamp. */
  draftVisibleAt: Date | string | null | undefined;
};

/** Returns true once the server-side 24h draft visibility window has elapsed. */
export function isDraftPreviewUnlocked(gate: DraftPreviewGateInput): boolean {
  if (!gate.draftVisibleAt) {
    // No visibility timestamp set:
    //  - Free-trial (lead magnet) letters fail CLOSED. The unlock timestamp
    //    is stamped at submit time; if it's missing (stamping bug or race),
    //    treating the letter as unlocked would hand out the full draft for
    //    free with no 24h window at all. Defense-in-depth callers
    //    (draftPdfRoute, subscriber routers) rely on this.
    //  - Non-free-trial letters fail OPEN: a null timestamp simply means the
    //    draft-visibility gate does not apply to this letter (legacy paid
    //    flow), not that it is waiting.
    return gate.isFreeTrialPreview !== true;
  }

  const visibleAt = new Date(gate.draftVisibleAt).getTime();
  if (Number.isNaN(visibleAt)) return false;
  return visibleAt <= Date.now();
}

/** Returns whole seconds remaining before draft visibility opens. */
export function getDraftPreviewRemainingSeconds(
  gate: DraftPreviewGateInput
): number {
  if (!gate.draftVisibleAt) {
    // Mirror isDraftPreviewUnlocked: a free-trial letter with no timestamp is
    // treated as freshly locked (full default window) rather than unlocked.
    return gate.isFreeTrialPreview === true
      ? DEFAULT_DRAFT_PREVIEW_WINDOW_SECONDS
      : 0;
  }

  const visibleAt = new Date(gate.draftVisibleAt).getTime();
  if (Number.isNaN(visibleAt)) return DEFAULT_DRAFT_PREVIEW_WINDOW_SECONDS;

  return Math.max(0, Math.ceil((visibleAt - Date.now()) / 1000));
}
