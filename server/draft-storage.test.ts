import { describe, it, expect, vi, beforeEach } from "vitest";

const upload = vi.fn();
const from = vi.fn(() => ({ upload }));

vi.mock("./supabaseAuth/client", () => ({
  getAdminClient: () => ({ storage: { from } }),
}));

import {
  DRAFT_BUCKET,
  draftStoragePath,
  saveDraftToStorage,
} from "./pipeline/draft-storage";

const LETTER_ID = 7;
const VERSION_ID = 12;

describe("saveDraftToStorage", () => {
  beforeEach(() => {
    upload.mockReset();
    from.mockClear();
  });

  it("builds a path from the letter and version ids", () => {
    expect(draftStoragePath(LETTER_ID, VERSION_ID)).toBe("letter-7/ai_draft-v12.txt");
  });

  it("uploads the draft as plain text to the private bucket", async () => {
    upload.mockResolvedValue({ error: null });
    const path = await saveDraftToStorage(LETTER_ID, VERSION_ID, "Dear Sir or Madam:");

    expect(path).toBe("letter-7/ai_draft-v12.txt");
    expect(from).toHaveBeenCalledWith(DRAFT_BUCKET);
    const [uploadedPath, body, options] = upload.mock.calls[0];
    expect(uploadedPath).toBe("letter-7/ai_draft-v12.txt");
    expect(Buffer.from(body).toString("utf-8")).toBe("Dear Sir or Madam:");
    expect(options).toMatchObject({ contentType: "text/plain; charset=utf-8", upsert: true });
  });

  it("returns null instead of throwing when Storage reports an error", async () => {
    upload.mockResolvedValue({ error: { message: "bucket not found" } });
    await expect(saveDraftToStorage(LETTER_ID, VERSION_ID, "x")).resolves.toBeNull();
  });

  it("returns null instead of throwing when the upload throws", async () => {
    upload.mockRejectedValue(new Error("network down"));
    await expect(saveDraftToStorage(LETTER_ID, VERSION_ID, "x")).resolves.toBeNull();
  });
});
