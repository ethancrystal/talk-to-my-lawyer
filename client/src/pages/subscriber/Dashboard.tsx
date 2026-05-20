import AppLayout from "@/components/shared/AppLayout";
import OnboardingModal from "@/components/OnboardingModal";
import UpgradeBanner from "@/components/UpgradeBanner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
// ANALYZE_PREFILL_KEY / US_STATES / AnalysisPrefill / DocumentAnalysisResult
// no longer imported here — they backed the document-analyzer "Draft Letter
// from analysis" prefill flow, which was removed 2026-05-20 along with the
// AnalysisHistory card. Restore alongside the AnalysisHistory render block.
import ApprovedLetterPreviewModal from "@/components/ApprovedLetterPreviewModal";
import { useLetterListRealtime } from "@/hooks/useLetterRealtime";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { useStaggerReveal } from "@/hooks/useAnimations";

// Sub-components
import { WelcomeBanner } from "@/components/subscriber/dashboard/WelcomeBanner";
import { NotificationsPanel } from "@/components/subscriber/dashboard/NotificationsPanel";
import { SubscriptionBanner } from "@/components/subscriber/dashboard/SubscriptionBanner";
import { FreeTierBanner } from "@/components/subscriber/dashboard/FreeTierBanner";
import { DashboardStats } from "@/components/subscriber/dashboard/DashboardStats";
import { LetterList } from "@/components/subscriber/dashboard/LetterList";
// AnalysisHistory removed 2026-05-20 — Doc Analyzer feature temporarily disabled.
import { StatusGuide } from "@/components/subscriber/dashboard/StatusGuide";

// Statuses where the dashboard should auto-refresh
const ACTIVE_STATUSES = [
  "submitted",
  "researching",
  "drafting",
  "pending_review",
  "under_review",
  "client_approval_pending",
  "client_revision_requested",
];

export default function SubscriberDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const utils = trpc.useUtils();

  const [approvedQueryParam, setApprovedQueryParam] = useState<
    number | undefined
  >(undefined);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const val = params.get("approved");
    if (val) {
      const id = parseInt(val, 10);
      if (!isNaN(id)) {
        setApprovedQueryParam(id);
        window.history.replaceState({}, "", "/dashboard");
      }
    }
  }, [searchString]);

  const {
    data: subscription,
    error: subscriptionError,
    refetch: refetchSubscription,
  } = trpc.billing.getSubscription.useQuery();

  const {
    data: letters,
    isLoading,
    error: lettersError,
    refetch: refetchLetters,
  } = trpc.letters.myLetters.useQuery(undefined, {
    refetchInterval: query => {
      const list = query.state.data;
      if (list?.some((l: any) => ACTIVE_STATUSES.includes(l.status)))
        return 8000;
      return false;
    },
  });

  // trpc.documents.getMyAnalyses query removed 2026-05-20 along with the
  // AnalysisHistory card. Backend procedure still exists, just no longer called.

  // Supabase Realtime — instant updates when any letter changes for this user
  useLetterListRealtime({
    userId: user?.id ?? null,
    onAnyChange: () => utils.letters.myLetters.invalidate(),
    enabled: !!user?.id,
  });

  // resolveJurisdictionCode + handleUseAnalysis removed 2026-05-20 — they
  // existed solely to convert a stored DocumentAnalysisResult into an
  // AnalysisPrefill and route the subscriber to /submit. Restore from
  // useDocumentAnalyzer.ts (same logic exists there) when re-enabling.

  const lettersTotal = letters?.length ?? 0;
  const stats = {
    total: lettersTotal,
    active:
      letters?.filter(
        l =>
          ![
            "approved",
            "rejected",
            "client_approved",
            "client_declined",
            "sent",
          ].includes(l.status)
      ).length ?? 0,
    approved:
      letters?.filter(l =>
        ["approved", "client_approved", "sent"].includes(l.status)
      ).length ?? 0,
    needsAttention:
      letters?.filter(l =>
        [
          "needs_changes",
          "generated_locked",
          "client_approval_pending",
        ].includes(l.status)
      ).length ?? 0,
  };

  const recentLetters = letters?.slice(0, 5) ?? [];
  const statCardVisible = useStaggerReveal(4, 80);
  const letterVisible = useStaggerReveal(recentLetters.length, 60);

  return (
    <AppLayout breadcrumb={[{ label: "Dashboard" }]}>
      <OnboardingModal />
      {letters && letters.length > 0 && (
        <ApprovedLetterPreviewModal
          letters={letters.map(l => ({
            id: l.id,
            subject: l.subject,
            pdfUrl: l.pdfUrl ?? null,
            status: l.status,
          }))}
          forceLetterIds={approvedQueryParam ? [approvedQueryParam] : undefined}
        />
      )}

      <div className="space-y-6">
        <WelcomeBanner subscriberId={user?.subscriberId} />
        <NotificationsPanel />

        {subscription && (
          <>
            <SubscriptionBanner subscription={subscription} />
            <UpgradeBanner plan={subscription.plan} />
          </>
        )}

        {(!subscription ||
          subscription.status !== "active" ||
          subscription.plan === "per_letter") && (
          <FreeTierBanner totalLetters={lettersTotal} />
        )}

        <DashboardStats stats={stats} statCardVisible={statCardVisible} />

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Your Letters
            </h2>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/letters">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>

          {(subscriptionError || lettersError) && (
            <Card className="border-destructive/50">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <AlertCircle className="w-8 h-8 text-destructive mb-3" />
                <p className="text-sm font-medium text-destructive">
                  Something went wrong
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(subscriptionError || lettersError)?.message}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    refetchSubscription();
                    refetchLetters();
                  }}
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          <LetterList
            letters={recentLetters}
            isLoading={isLoading}
            letterVisible={letterVisible}
          />
        </div>

        {/* AnalysisHistory card removed 2026-05-20 along with the rest of
            the Doc Analyzer surface. Restore by reverting this Dashboard
            edit + re-importing AnalysisHistory above. */}

        <StatusGuide />
      </div>
    </AppLayout>
  );
}
