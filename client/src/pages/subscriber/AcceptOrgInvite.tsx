import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * Accept a team invitation. Public route (the invitee may not have an account
 * yet). Three states:
 *   - not signed in → prompt to sign up (new) or log in (existing); both carry a
 *     ?next back here so acceptance resumes after auth.
 *   - signed in → auto-accept once, then route to the org console.
 *   - error → clear message (invalid / expired / wrong email / already used).
 *
 * Lives under /subscriber so a freshly-signed-up subscriber's post-auth redirect
 * is permitted by isRoleAllowedOnPath.
 */
export default function AcceptOrgInvite() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";

  const nextPath = `/subscriber/accept-invite?token=${encodeURIComponent(token)}`;
  const nextParam = encodeURIComponent(nextPath);

  const accept = trpc.organizations.acceptInvitation.useMutation();
  const firedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !isAuthenticated || !token || firedRef.current) return;
    firedRef.current = true;
    accept.mutate(
      { token },
      {
        onSuccess: () => navigate("/subscriber/organization?joined=1"),
        onError: (err) => setErrorMessage(err.message),
      }
    );
  }, [loading, isAuthenticated, token, accept, navigate]);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Team invitation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </div>
  );

  if (!token) {
    return (
      <Shell>
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
          This invitation link is missing its token. Ask your team admin to resend it.
        </div>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </Shell>
    );
  }

  if (!isAuthenticated) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">
          To join the team, sign in or create an account with the email your invitation was sent to.
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild data-testid="link-accept-signup">
            <Link href={`/signup?next=${nextParam}`}>Create an account</Link>
          </Button>
          <Button asChild variant="outline" data-testid="link-accept-login">
            <Link href={`/login?next=${nextParam}`}>I already have an account</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  if (errorMessage) {
    return (
      <Shell>
        <div className="flex items-start gap-2 text-sm text-muted-foreground" data-testid="text-accept-error">
          <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
          {errorMessage}
        </div>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Go to dashboard
        </Button>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {accept.isSuccess ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-600" /> Joined — taking you to your team…
          </>
        ) : (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Joining the team…
          </>
        )}
      </div>
    </Shell>
  );
}
