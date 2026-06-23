import { buildEmailHtml, sendWithRetry } from "../../core";

/**
 * Invite someone to join an organization (team account). Transactional — sent
 * only when an org owner/admin explicitly invites this address. The link carries
 * a single-use token; the recipient signs up or logs in and is auto-joined.
 */
export async function sendOrgInvitationEmail(opts: {
  to: string;
  orgName: string;
  inviterName: string;
  inviteUrl: string;
  role: string;
}): Promise<void> {
  const roleLabel = opts.role === "admin" ? "an admin" : "a member";
  const subject = `You're invited to join ${opts.orgName} on Talk-to-My-Lawyer`;
  const body = `
    <p style="margin:0 0 14px;font-family:Inter,Arial,sans-serif;font-size:15px;color:#374151;line-height:1.6;">
      ${opts.inviterName} has invited you to join <strong>${opts.orgName}</strong> as ${roleLabel} on
      Talk-to-My-Lawyer — the team shares a pool of attorney-reviewed legal letters.
    </p>
    <p style="margin:0 0 14px;font-family:Inter,Arial,sans-serif;font-size:15px;color:#374151;line-height:1.6;">
      Click below to accept. If you don't have an account yet, you'll create one first with this same
      email address, then you'll join the team automatically.
    </p>`;
  const html = buildEmailHtml({
    preheader: `Join ${opts.orgName} on Talk-to-My-Lawyer`,
    title: `Join ${opts.orgName}`,
    body,
    ctaText: "Accept invitation",
    ctaUrl: opts.inviteUrl,
    footerNote:
      "This invitation link is single-use and expires in 7 days. If you weren't expecting it, you can ignore this email.",
  });
  const text = `${opts.inviterName} invited you to join ${opts.orgName} as ${roleLabel} on Talk-to-My-Lawyer.\n\nAccept your invitation: ${opts.inviteUrl}\n\nThis single-use link expires in 7 days. If you weren't expecting it, you can ignore this email.`;
  await sendWithRetry({ to: opts.to, subject, html, text });
}
