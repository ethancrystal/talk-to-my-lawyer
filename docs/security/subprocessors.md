# TTML Subprocessors

This page lists the third-party subprocessors Talk-to-My-Lawyer (TTML) uses to
deliver the service, what they process, and why. Enterprise customers and their
counsel rely on this list for vendor-risk and DPA review.

> **Maintenance:** update this list whenever a provider is added, removed, or its
> role changes. Notify enterprise customers under contract before adding a new
> subprocessor that processes customer content, per the DPA.

_Last reviewed: 2026-06-13._

## Subprocessors that may process customer content

These providers may process letter content, intake data, or personal data on
TTML's behalf.

| Subprocessor | Purpose | Data processed | Notes |
| --- | --- | --- | --- |
| **OpenAI** | Primary LLM for the letter-generation pipeline (research, drafting, assembly, vetting) | Intake facts + draft letter text | Configure zero-retention / no-training enterprise terms before enterprise GA. |
| **Anthropic (Claude)** | Fallback LLM for the same pipeline stages | Intake facts + draft letter text | Same zero-retention/no-training requirement. |
| **Perplexity** | Legal-research grounding (when enabled) | Matter description + jurisdiction query | Web-grounded research path. |
| **Supabase** | Primary Postgres database + authentication | All application data, incl. letter content & PII | Hosts the system of record. TLS with CA verification. |
| **Cloudflare R2** | Object storage for generated PDFs and uploaded documents | Letter PDFs, uploaded evidence files | Accessed via short-lived presigned URLs; bucket denies anonymous access. |
| **Resend** | Transactional email delivery | Recipient email, name, letter metadata in notifications | No full letter bodies sent by email. |

## Subprocessors that process operational / metadata only

| Subprocessor | Purpose | Data processed |
| --- | --- | --- |
| **Stripe** | Payments, subscriptions, invoicing | Billing identifiers, payment metadata (no card data touches TTML servers) |
| **Upstash (Redis)** | Rate limiting + ephemeral cache | Request counters, transient keys |
| **Sentry** | Error monitoring | Stack traces + request context (IDs, not letter content) |
| **Cloudflare (Workers / AI Gateway)** | Optional email/PDF/cache workers and LLM gateway | Transits content only when the corresponding worker/gateway is enabled |
| **Railway** | Application + worker hosting | Runtime environment; processes data in memory during request handling |

## Data location

Primary data (Supabase Postgres, Cloudflare R2) is hosted in the provider's
configured region. Enterprise customers with data-residency requirements should
raise them during contracting so the deployment region can be confirmed.

## Removing / replacing a subprocessor

When a provider is removed, confirm no customer data remains with it (request
deletion per the provider's DPA) and record the change here with the date.
