/**
 * admin-force-transition-guard.test.ts
 *
 * Legal-integrity regression guard. forceStatusTransition is a super-admin
 * override that bypasses the status machine. It must NOT be able to push a
 * letter into an approval/delivery status without an attorney-approved
 * (final_approved) version — doing so would put an unreviewed, AI-generated
 * letter in front of a recipient under an attorney's name, defeating the
 * product's central control (mandatory attorney review) and creating direct
 * UPL / malpractice exposure.
 *
 * The legitimate "rescue a stuck letter" path forces to under_review (where an
 * attorney still signs off) and is unaffected.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetLetterRequestById = vi.fn();
const mockGetLetterVersionsByRequestId = vi.fn();
const mockUpdateLetterStatus = vi.fn().mockResolvedValue(undefined);
const mockLogReviewAction = vi.fn().mockResolvedValue(undefined);
const mockNotifyAdmins = vi.fn().mockResolvedValue(undefined);
const mockGetUserById = vi.fn().mockResolvedValue(null);
const mockGetDb = vi.fn().mockResolvedValue(null);

// NB: vi.mock paths are resolved relative to THIS test file (server/), so we
// mock "./db" etc. — the same modules admin.ts (in server/services/) imports as
// "../db" etc.
vi.mock("./db", () => ({
  getLetterRequestById: (...a: unknown[]) => mockGetLetterRequestById(...a),
  getLetterVersionsByRequestId: (...a: unknown[]) => mockGetLetterVersionsByRequestId(...a),
  updateLetterStatus: (...a: unknown[]) => mockUpdateLetterStatus(...a),
  logReviewAction: (...a: unknown[]) => mockLogReviewAction(...a),
  notifyAdmins: (...a: unknown[]) => mockNotifyAdmins(...a),
  getUserById: (...a: unknown[]) => mockGetUserById(...a),
  getDb: (...a: unknown[]) => mockGetDb(...a),
  // Unused-by-this-path exports referenced elsewhere in admin.ts's barrel import.
  updateUserRole: vi.fn(),
  assignRoleId: vi.fn(),
  createNotification: vi.fn(),
  getAllLetterRequests: vi.fn(),
  getUserByEmail: vi.fn(),
  getWorkflowJobsByLetterId: vi.fn(),
}));

vi.mock("./email", () => ({
  sendAttorneyInvitationEmail: vi.fn().mockResolvedValue(undefined),
  sendNewReviewNeededEmail: vi.fn().mockResolvedValue(undefined),
  sendStatusUpdateEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./sentry", () => ({ captureServerException: vi.fn() }));
vi.mock("./supabaseAuth", () => ({
  invalidateUserCache: vi.fn(),
  getOriginUrl: vi.fn(() => "https://app.example.com"),
}));
vi.mock("./stripe", () => ({ hasEverSubscribed: vi.fn().mockResolvedValue(false) }));

const { forceStatusTransition } = await import("./services/admin");

const CTX = { userId: 1, appUrl: "https://app.example.com" };

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateLetterStatus.mockResolvedValue(undefined);
  mockLogReviewAction.mockResolvedValue(undefined);
  mockNotifyAdmins.mockResolvedValue(undefined);
  mockGetUserById.mockResolvedValue(null);
  mockGetDb.mockResolvedValue(null);
  // A normal non-free-preview letter that does NOT match the under_review bypass.
  mockGetLetterRequestById.mockResolvedValue({
    id: 42,
    status: "pending_review",
    isFreePreview: false,
    freePreviewUnlockAt: null,
    userId: 5,
    subject: "Demand Letter",
  });
});

const DELIVERY_STATUSES = ["approved", "client_approval_pending", "client_approved", "sent"];

describe("forceStatusTransition — attorney-review (final_approved) gate", () => {
  for (const status of DELIVERY_STATUSES) {
    it(`rejects forcing to "${status}" when no final_approved version exists`, async () => {
      mockGetLetterVersionsByRequestId.mockResolvedValue([
        { versionType: "ai_draft", content: "draft" },
        { versionType: "attorney_edit", content: "edited" },
      ]);
      await expect(
        forceStatusTransition({ letterId: 42, newStatus: status, reason: "test" }, CTX)
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
      expect(mockUpdateLetterStatus).not.toHaveBeenCalled();
    });

    it(`allows forcing to "${status}" when a final_approved version exists`, async () => {
      mockGetLetterVersionsByRequestId.mockResolvedValue([
        { versionType: "ai_draft", content: "draft" },
        { versionType: "final_approved", content: "approved letter" },
      ]);
      await forceStatusTransition({ letterId: 42, newStatus: status, reason: "test" }, CTX);
      expect(mockUpdateLetterStatus).toHaveBeenCalledWith(
        42,
        status,
        expect.anything()
      );
    });
  }

  it("still allows forcing to pending_review with only an ai_draft (review path unaffected)", async () => {
    mockGetLetterVersionsByRequestId.mockResolvedValue([
      { versionType: "ai_draft", content: "draft" },
    ]);
    await forceStatusTransition(
      { letterId: 42, newStatus: "pending_review", reason: "test" },
      CTX
    );
    expect(mockUpdateLetterStatus).toHaveBeenCalledWith(
      42,
      "pending_review",
      expect.anything()
    );
  });

  it("rejects forcing to pending_review when the letter has NO content version at all", async () => {
    mockGetLetterVersionsByRequestId.mockResolvedValue([]);
    await expect(
      forceStatusTransition(
        { letterId: 42, newStatus: "pending_review", reason: "test" },
        CTX
      )
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
