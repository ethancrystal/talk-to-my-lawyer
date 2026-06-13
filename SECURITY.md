# Security Policy

Talk-to-My-Lawyer (TTML) handles confidential legal-matter content for our
customers. We take the security and privacy of that content seriously.

## Reporting a vulnerability

If you believe you have found a security vulnerability, please report it
privately. **Do not open a public GitHub issue for security problems.**

- Email: **security@talk-to-my-lawyer.com**
- Include: a description, reproduction steps, affected endpoint/component, and
  the potential impact.
- We aim to acknowledge reports within **2 business days** and to provide a
  remediation timeline within **5 business days**.

Please act in good faith: do not access, modify, or exfiltrate data that is not
your own, and give us a reasonable window to remediate before any disclosure.

## Scope

In scope: the TTML web application, its API, and the AI letter-generation
pipeline. Out of scope: third-party subprocessors (report those to the vendor),
volumetric DoS, and social-engineering of our staff.

## Our security posture (summary)

A detailed, procurement-ready overview lives in
[`docs/security/security-overview.md`](docs/security/security-overview.md); the
subprocessor list is in
[`docs/security/subprocessors.md`](docs/security/subprocessors.md). Highlights:

- **Transport security** — TLS to the database with full CA-certificate
  verification (`rejectUnauthorized: true`); HTTPS in transit everywhere.
- **Authorization** — typed role guards on every privileged API procedure
  (subscriber / attorney / employee / admin / super-admin); object-level
  ownership enforced at the data-access layer; admin actions require a second
  factor (HMAC-signed `admin_2fa` cookie with TTL); super-admin is a hard-coded
  owner allowlist that cannot be changed via the UI or API.
- **Audit trail** — every letter status transition and attorney/admin action is
  recorded in an append-only `review_actions` log.
- **Payments** — Stripe webhook signatures are verified and processed with an
  atomic idempotency claim; prices are server-controlled (never client-supplied).
- **Secrets** — never exposed to the browser; only `VITE_`-prefixed values reach
  the client bundle.

## Supported versions

We ship from `main`; security fixes are applied to the currently deployed
production release.
