/**
 * Stripe Webhook Handler — Talk-to-My-Lawyer
 *
 * Entry point: signature verification, idempotency dedup, event routing.
 *
 * Sub-handlers:
 *   handlers/checkout.ts     — checkout.session.completed
 *   handlers/subscriptions.ts — subscription lifecycle + invoice events
 */

import type { Request, Response } from "express";
import Stripe from "stripe";
import { ENV } from "../_core/env";
import { getStripe } from "../stripe";
import { getDb } from "../db";
import { processedStripeEvents } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { captureServerException } from "../sentry";
import { stripeLogger } from "./_helpers";
import { handleCheckoutSessionCompleted } from "./handlers/checkout";
import {
  handleSubscriptionCreatedOrUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from "./handlers/subscriptions";

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      ENV.stripeWebhookSecret
    );
  } catch (err: any) {
    stripeLogger.error({ err }, "[StripeWebhook] Signature verification failed");
    captureServerException(err, {
      tags: { component: "stripe_webhook", error_type: "signature_verification" },
    });
    res.status(400).json({ error: "Webhook signature verification failed" });
    return;
  }

  // ─── Handle test events ───────────────────────────────────────────────────
  if (event.id.startsWith("evt_test_")) {
    stripeLogger.info({ eventId: event.id }, "[StripeWebhook] Test event detected, returning verification response");
    res.json({ verified: true });
    return;
  }

  stripeLogger.info({ eventType: event.type, eventId: event.id }, "[StripeWebhook] Processing event");

  // ─── Idempotency: atomic claim BEFORE processing ─────────────────────────
  // Insert the marker first and act only if WE inserted it (RETURNING is empty
  // on conflict). The old pattern was check-then-act — a SELECT, then process,
  // then INSERT — so two concurrent deliveries of the same event (Stripe does
  // retry/duplicate) could both pass the SELECT and process the event twice
  // (e.g. double commission, double quota reset). The atomic insert-claim
  // closes that race: exactly one caller wins the row and processes.
  const db = await getDb();
  if (db) {
    const claim = await db
      .insert(processedStripeEvents)
      .values({ eventId: event.id, eventType: event.type })
      .onConflictDoNothing()
      .returning({ eventId: processedStripeEvents.eventId });
    if (claim.length === 0) {
      stripeLogger.info({ eventId: event.id }, "[StripeWebhook] Duplicate event, skipping");
      res.json({ received: true, duplicate: true });
      return;
    }
  }

  let responded = false;
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionCreatedOrUpdated(event);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        stripeLogger.info({ eventType: event.type }, "[StripeWebhook] Unhandled event type");
    }

    res.json({ received: true });
    responded = true;
  } catch (err: any) {
    stripeLogger.error({ err }, "[StripeWebhook] Error processing event");
    captureServerException(err, {
      tags: { component: "stripe_webhook", event_type: event.type },
      extra: { eventId: event.id, eventType: event.type },
    });
    // Roll back the idempotency claim so Stripe's automatic retry can
    // re-process this event. Without this, a transient handler failure would
    // permanently swallow the event (the marker would block every retry).
    if (db) {
      try {
        await db
          .delete(processedStripeEvents)
          .where(eq(processedStripeEvents.eventId, event.id));
      } catch (rollbackErr) {
        stripeLogger.error(
          { err: rollbackErr, eventId: event.id },
          "[StripeWebhook] Failed to roll back idempotency claim after handler error"
        );
      }
    }
    if (!responded) {
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
}
