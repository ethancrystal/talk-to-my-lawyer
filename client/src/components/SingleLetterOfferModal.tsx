/**
 * SingleLetterOfferModal
 *
 * A special-offer popup surfacing the $200 one-time letter on the pricing
 * page. Self-triggers after a short delay on first mount and persists its
 * dismissal in sessionStorage so it does not re-appear within the same
 * tab session.
 *
 * The grid above still shows only Monthly + Yearly; this modal is the only
 * place the one-time-letter plan is exposed to subscribers.
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { PRICING } from "../../../shared/pricing";

const SESSION_DISMISS_KEY = "ttml.singleLetterOfferDismissed.v1";
const AUTO_OPEN_DELAY_MS = 3000;

interface SingleLetterOfferModalProps {
  /** Called when the user clicks the primary CTA. */
  onPurchase: (planId: string) => void;
  /** True while the parent's checkout mutation is in-flight for this plan. */
  isLoading?: boolean;
}

export default function SingleLetterOfferModal({
  onPurchase,
  isLoading = false,
}: SingleLetterOfferModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
    } catch {
      // Session storage may be unavailable in private mode — fall through.
    }
    if (dismissed) return;

    const timer = window.setTimeout(() => setOpen(true), AUTO_OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      try {
        window.sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
      } catch {
        // No-op if storage is blocked.
      }
    }
  };

  const handlePurchase = () => {
    // Mark dismissed so it doesn't re-pop after redirect-back from Stripe.
    try {
      window.sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    } catch {
      // No-op.
    }
    onPurchase(PRICING.oneTimeLetter.id);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-testid="modal-single-letter-offer"
        className="sm:max-w-md p-0 overflow-hidden"
      >
        {/* Accent strip */}
        <div
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
          aria-hidden="true"
        />

        <div className="p-6 pt-7">
          <DialogHeader>
            <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 px-2.5 py-1 mb-3 ring-1 ring-amber-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Special offer
              </span>
            </div>
            <DialogTitle className="text-2xl font-black text-slate-900 leading-tight">
              Just need one letter?
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              Pay once, get one attorney-reviewed legal letter. No
              subscription, no recurring charges.
            </DialogDescription>
          </DialogHeader>

          {/* Price block */}
          <div className="mt-5 mb-5 pb-5 border-b border-slate-100">
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl font-black text-slate-900 leading-none">
                {PRICING.oneTimeLetter.priceDisplay}
              </span>
              <span className="text-base text-slate-500 font-medium ml-1">
                {PRICING.oneTimeLetter.period}
              </span>
            </div>
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Attorney review included
            </div>
          </div>

          {/* Features */}
          <ul className="space-y-2 mb-2">
            {PRICING.oneTimeLetter.features.map(feature => (
              <li
                key={feature}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <span
                  className="flex-shrink-0 w-4 h-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mt-0.5"
                  aria-hidden="true"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                </span>
                <span className="leading-snug">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <Button
            data-testid="button-dismiss-single-letter-offer"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto text-slate-500 hover:text-slate-700"
          >
            Maybe later
          </Button>
          <Button
            data-testid="button-claim-single-letter-offer"
            onClick={handlePurchase}
            disabled={isLoading}
            className="w-full sm:flex-1 h-11 font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg group/cta"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Processing…
              </>
            ) : (
              <>
                Claim this offer
                <ArrowRight className="w-4 h-4 ml-1.5 group-hover/cta:translate-x-0.5 transition-transform" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
