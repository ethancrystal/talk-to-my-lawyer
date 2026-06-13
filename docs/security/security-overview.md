# TTML Security Overview

A procurement-ready summary of how Talk-to-My-Lawyer (TTML) protects customer
data. Written to answer the questions that appear on enterprise / law-firm
security questionnaires. Statements describe controls implemented in the
codebase as of 2026-06-13; items still in progress are marked **(roadmap)**.

> This document is a factual engineering summary, not a contract. Contractual
> commitments live in the MSA/DPA.

## 1. Data handled

- **Customer content:** legal-matter intake (parties, facts, jurisdiction,
  amounts), AI-generated draft letters, attorney-edited and final letters,
  uploaded evidence documents.
- **Account data:** name, email, role, subscription/billing identifiers.
- TTML never stores payment card numbers — card data is handled entirely by
  Stripe.

## 2. Authentication & access control

- Authentication via Supabase Auth (JWT); the server re-syncs identity on each
  request with a short cache.
- **Role-based authorization** is enforced server-side on every privileged API
  procedure (tRPC guards): `subscriber`, `attorney`, `employee`, `admin`,
  `superAdmin`. Client-side checks are never trusted.
- **Object-level authorization:** letter/version/document reads are filtered by
  owner (`userId`) at the data-access layer, so one customer cannot read
  another's content.
- **Admin second factor:** admin actions require an HMAC-signed `admin_2fa`
  cookie with a TTL and constant-time verification.
- **Super-admin** is a hard-coded owner-email allowlist; it cannot be granted via
  the UI or API.

## 3. Encryption

- **In transit:** HTTPS for all client/server traffic; database connections use
  TLS with full CA-certificate verification (`rejectUnauthorized: true`).
- **At rest:** provided by the managed data stores (Supabase Postgres,
  Cloudflare R2). Disk-level encryption is a property of those platforms.

## 4. Document access

- Generated PDFs and uploaded files are stored in a private Cloudflare R2 bucket
  that denies anonymous and public-key access.
- Files are served only through short-lived presigned URLs issued by the backend
  to authorized users.

## 5. Auditability

- Every letter status transition and every attorney/admin action is recorded in
  an append-only `review_actions` log with actor, action, and visibility
  (`internal` vs `user_visible`).
- AI-generated letter versions are immutable; edits always create a new version,
  preserving the full chain of custody from AI draft → attorney edit → final.

## 6. Payments integrity

- Stripe webhook signatures are verified before processing.
- Events are processed under an atomic idempotency claim
  (`INSERT … ON CONFLICT DO NOTHING RETURNING`), so duplicate deliveries cannot
  double-charge or double-grant entitlements.
- Prices are resolved server-side from a single source of truth; the client can
  never supply an amount.

## 7. Reliability

- A background health probe checks the database, queue, cache, and external
  providers.
- The AI pipeline has layered failure recovery (per-letter locking, retries,
  best-effort degraded finalize, provider failover) and records failures with
  status + refund bookkeeping.
- Vulnerability/dependency patching is tracked (see the Dependabot audit logs in
  `docs/`).

## 8. Vulnerability disclosure

See [`/SECURITY.md`](../../SECURITY.md). Reports go to
security@talk-to-my-lawyer.com; acknowledgement within 2 business days.

## 9. Subprocessors

Enumerated in [`subprocessors.md`](subprocessors.md), including which providers
may process customer content.

## 10. Roadmap (disclosed for transparency)

These are in progress and are the honest gaps an enterprise buyer should know
about:

- **(roadmap)** Postgres Row-Level Security is enabled as defense-in-depth but
  not yet the primary isolation layer; application-layer authorization is the
  enforced control today.
- **(roadmap)** Self-service data export and hard-delete (CCPA/GDPR data-subject
  requests) — currently handled as an operational process; self-service tooling
  is being built.
- **(roadmap)** A documented data-retention/purge schedule.
- **(roadmap)** Signed DPA + configurable LLM provider zero-retention terms for
  enterprise tier.
- **(roadmap)** SSO/SAML and organization/team accounts for multi-seat buyers.
- **(roadmap)** Formal DR runbook with stated RPO/RTO and restore testing.
