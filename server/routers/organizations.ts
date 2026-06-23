/**
 * Organizations Router — B2B team-account self-service console.
 *
 * Surfaces the org/teams DAL to org owners/admins: view the shared pool + roster,
 * invite existing TTML users onto the team, and remove members. Org creation +
 * seat billing happen via Stripe team checkout + the provisioning webhook (see
 * server/stripe/checkouts.ts → createTeamCheckoutSession and
 * server/stripeWebhook/handlers/subscriptions.ts), not here.
 *
 * All mutations are gated: only an owner/admin of the org may manage it, and the
 * owner can never be removed or demoted through this surface.
 */

import { z } from "zod";
import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { subscriberProcedure } from "./_shared";
import { checkTrpcRateLimit } from "../rateLimiter";
import {
  getOrganizationForUser,
  getOrganizationMembers,
  addOrganizationMember,
  removeOrganizationMember,
  getUserByEmail,
  createInvitation,
  listPendingInvitations,
  revokeInvitation as revokeInvitationDal,
  acceptInvitation as acceptInvitationDal,
  type OrganizationMemberRole,
} from "../db";
import { updateTeamSeatQuantity } from "../stripe";
import { sendOrgInvitationEmail } from "../email";
import { TEAM_PLAN } from "../../shared/pricing";
import { createLogger } from "../logger";

const log = createLogger({ module: "OrganizationsRouter" });

/** Base URL for invite links in emails (recipient context — not request origin). */
function appBaseUrl(): string {
  return process.env.APP_BASE_URL || "https://www.talk-to-my-lawyer.com";
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ADMIN_ROLES: OrganizationMemberRole[] = ["owner", "admin"];

function assertOrgAdmin(role: OrganizationMemberRole | null | undefined): void {
  if (!role || !ADMIN_ROLES.includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only an organization owner or admin can manage the team.",
    });
  }
}

export const organizationsRouter = router({
  /**
   * The caller's organization with role, shared-pool usage, and roster.
   * Returns { organization: null } for solo accounts (no membership row).
   */
  myOrganization: subscriberProcedure.query(async ({ ctx }) => {
    const org = await getOrganizationForUser(ctx.user.id);

    type MemberSummary = Awaited<ReturnType<typeof getOrganizationMembers>>;
    // Uniform shape (members always present) so the client data type isn't a
    // discriminated union — simplifies consumers.
    if (!org) {
      return {
        organization: null as null,
        members: [] as MemberSummary,
      };
    }

    const isAdmin = ADMIN_ROLES.includes(org.memberRole);
    // Only admins see the full member roster; members see just the pool + their role.
    const members: MemberSummary = isAdmin
      ? await getOrganizationMembers(org.id)
      : [];

    return {
      organization: {
        id: org.id,
        name: org.name,
        plan: org.plan,
        role: org.memberRole,
        isAdmin,
        ownerId: org.ownerId,
        seatsAllowed: org.seatsAllowed,
        lettersAllowed: org.lettersAllowed,
        lettersUsed: org.lettersUsed,
        lettersRemaining: Math.max(0, org.lettersAllowed - org.lettersUsed),
      },
      members,
    };
  }),

  /**
   * Invite an EXISTING TTML user onto the team by email. (Inviting people who
   * don't yet have an account requires an invitations table + acceptance email —
   * a documented follow-up; for now they must sign up first.) Seat capacity is
   * enforced against seatsAllowed.
   */
  inviteMember: subscriberProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["admin", "member"]).default("member"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await checkTrpcRateLimit("general", `org-invite:${ctx.user.id}`);
      const org = await getOrganizationForUser(ctx.user.id);
      if (!org) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not part of an organization.",
        });
      }
      assertOrgAdmin(org.memberRole);

      const invitee = await getUserByEmail(input.email.trim());
      if (!invitee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "No TTML account found for that email. Ask them to sign up first, then invite them.",
        });
      }

      // Seat-capacity check (count current members against purchased seats).
      const current = await getOrganizationMembers(org.id);
      if (current.some((m) => m.userId === invitee.id)) {
        return { added: false, reason: "already_member" as const };
      }
      if (current.length >= org.seatsAllowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Your plan includes ${org.seatsAllowed} seat(s), all in use. Add seats to invite more members.`,
        });
      }

      await addOrganizationMember({
        organizationId: org.id,
        userId: invitee.id,
        role: input.role,
      });
      return { added: true as const, userId: invitee.id };
    }),

  /** Remove a member from the team. The owner cannot be removed. */
  removeMember: subscriberProcedure
    .input(z.object({ userId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const org = await getOrganizationForUser(ctx.user.id);
      if (!org) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not part of an organization.",
        });
      }
      assertOrgAdmin(org.memberRole);

      if (input.userId === org.ownerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The organization owner cannot be removed.",
        });
      }

      await removeOrganizationMember(org.id, input.userId);
      return { removed: true as const };
    }),

  /**
   * Invite a teammate by email — works whether or not they already have a TTML
   * account. Creates a single-use token, emails a join link; on acceptance they
   * sign up / log in and auto-join. When members + pending invites already fill
   * the paid seats, the admin must pass confirmAddSeat to add a seat (charged
   * immediately, prorated) before the invite is created.
   */
  inviteByEmail: subscriberProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["admin", "member"]).default("member"),
        confirmAddSeat: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await checkTrpcRateLimit("general", `org-invite:${ctx.user.id}`);
      const org = await getOrganizationForUser(ctx.user.id);
      if (!org) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not part of an organization.",
        });
      }
      assertOrgAdmin(org.memberRole);

      const email = input.email.trim().toLowerCase();
      const members = await getOrganizationMembers(org.id);
      const existingUser = await getUserByEmail(email);
      if (existingUser && members.some((m) => m.userId === existingUser.id)) {
        return { status: "already_member" as const };
      }

      const pending = await listPendingInvitations(org.id);
      if (pending.some((i) => i.email.toLowerCase() === email)) {
        return { status: "already_invited" as const };
      }

      // Seat capacity: members + pending invites both count against paid seats.
      const seatsInUse = members.length + pending.length;
      if (seatsInUse >= org.seatsAllowed) {
        if (!input.confirmAddSeat) {
          return {
            status: "needs_seat" as const,
            seatsAllowed: org.seatsAllowed,
            pricePerSeatDisplay: TEAM_PLAN.pricePerSeatDisplay,
          };
        }
        // Add a seat now, prorated. Requires the org's subscription id; legacy
        // orgs back-fill it on their next Stripe webhook, so guard rather than
        // crash if it isn't present yet.
        if (!org.stripeSubscriptionId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "We couldn't adjust your seats automatically yet. Please add a seat from billing, then send the invite.",
          });
        }
        await updateTeamSeatQuantity(org.stripeSubscriptionId, seatsInUse + 1);
        // org.seatsAllowed / pool reconcile via the customer.subscription.updated
        // webhook (provisionTeamFromSubscription) — no double-write here.
      }

      const rawToken = randomBytes(32).toString("base64url");
      await createInvitation({
        organizationId: org.id,
        email,
        rawToken,
        role: input.role,
        invitedByUserId: ctx.user.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      });

      // Path lives under /subscriber so the post-auth redirect survives the
      // role-path allow-list (isRoleAllowedOnPath) for a freshly signed-up invitee.
      const inviteUrl = `${appBaseUrl()}/subscriber/accept-invite?token=${rawToken}`;
      try {
        await sendOrgInvitationEmail({
          to: email,
          orgName: org.name,
          inviterName: ctx.user.name ?? "A teammate",
          inviteUrl,
          role: input.role,
        });
      } catch (err) {
        // The invitation row exists; only the email failed. Surface so the admin
        // can resend rather than silently dropping it.
        log.error(
          { err, orgId: org.id, email },
          "[inviteByEmail] invite created but email send failed"
        );
        return { status: "invited_email_failed" as const };
      }

      return { status: "invited" as const };
    }),

  /** Pending invitations for the org (owner/admin only). */
  listInvitations: subscriberProcedure.query(async ({ ctx }) => {
    const org = await getOrganizationForUser(ctx.user.id);
    if (!org || !ADMIN_ROLES.includes(org.memberRole)) {
      return { invitations: [] as Array<Record<string, unknown>> };
    }
    const pending = await listPendingInvitations(org.id);
    return {
      invitations: pending.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
    };
  }),

  /** Revoke a pending invitation (owner/admin only). */
  revokeInvitation: subscriberProcedure
    .input(z.object({ invitationId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const org = await getOrganizationForUser(ctx.user.id);
      if (!org) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not part of an organization." });
      }
      assertOrgAdmin(org.memberRole);
      await revokeInvitationDal(org.id, input.invitationId);
      return { revoked: true as const };
    }),

  /**
   * Accept an invitation. Any authenticated user (the invitee may have just
   * signed up and not be a subscriber yet), but acceptance is bound to the
   * invited email inside the DAL.
   */
  acceptInvitation: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const email = ctx.user.email;
      if (!email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Your account has no email address on file.",
        });
      }
      const result = await acceptInvitationDal({
        rawToken: input.token,
        userId: ctx.user.id,
        userEmail: email,
      });
      if (!result.ok) {
        const messages: Record<typeof result.reason, string> = {
          not_found: "This invitation link is invalid.",
          not_pending: "This invitation has already been used or was revoked.",
          expired: "This invitation has expired — ask the team admin to resend it.",
          email_mismatch:
            "This invitation was sent to a different email address. Sign in with that address to accept it.",
        };
        throw new TRPCError({ code: "BAD_REQUEST", message: messages[result.reason] });
      }
      return { ok: true as const, organizationId: result.organizationId };
    }),
});
