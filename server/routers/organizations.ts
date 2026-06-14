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
import { TRPCError } from "@trpc/server";
import { router } from "../_core/trpc";
import { subscriberProcedure } from "./_shared";
import { checkTrpcRateLimit } from "../rateLimiter";
import {
  getOrganizationForUser,
  getOrganizationMembers,
  addOrganizationMember,
  removeOrganizationMember,
  getUserByEmail,
  type OrganizationMemberRole,
} from "../db";

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
});
