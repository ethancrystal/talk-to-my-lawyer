import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/shared/AppLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Loader2,
  UserPlus,
  Trash2,
  FileText,
} from "lucide-react";
import { TEAM_PLAN, TEAM_MIN_SEATS, TEAM_MAX_SEATS } from "../../../../shared/pricing";

/**
 * Team / organization console.
 *
 * Three states, driven entirely by the server's organizations.myOrganization:
 *   - No org           → "Start a team" purchase card (seat checkout).
 *   - Org member       → read-only pool usage + your role.
 *   - Org owner/admin  → pool usage + member roster (invite / remove).
 */
export default function Organization() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.organizations.myOrganization.useQuery();

  const org = data?.organization ?? null;

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Team</h1>
            <p className="text-sm text-muted-foreground">
              Shared letter pool and member management for your organization.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : org ? (
          <OrgConsole org={org} members={data?.members ?? []} utils={utils} />
        ) : (
          <StartTeamCard />
        )}
      </div>
    </AppLayout>
  );
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <div className="text-primary">{icon}</div>
      <div>
        <div className="text-xl font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

interface OrgSummary {
  id: number;
  name: string;
  plan: string | null;
  role: string;
  isAdmin: boolean;
  ownerId: number | null;
  seatsAllowed: number;
  lettersAllowed: number;
  lettersUsed: number;
  lettersRemaining: number;
}
interface MemberRow {
  userId: number;
  role: string;
  name: string | null;
  email: string | null;
}

function OrgConsole({
  org,
  members,
  utils,
}: {
  org: OrgSummary;
  members: MemberRow[];
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const [inviteEmail, setInviteEmail] = useState("");

  const invite = trpc.organizations.inviteMember.useMutation({
    onSuccess: (res) => {
      if (res.added) {
        toast.success("Member added to your team");
      } else {
        toast.info("That person is already on your team");
      }
      setInviteEmail("");
      utils.organizations.myOrganization.invalidate();
    },
    onError: (err) => toast.error("Could not add member", { description: err.message }),
  });

  const remove = trpc.organizations.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      utils.organizations.myOrganization.invalidate();
    },
    onError: (err) => toast.error("Could not remove member", { description: err.message }),
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{org.name}</CardTitle>
            <Badge variant="secondary">{org.role}</Badge>
          </div>
          <CardDescription>
            Letters are drawn from a single shared pool across the whole team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Letters left"
              value={org.lettersRemaining}
              icon={<FileText className="h-5 w-5" />}
            />
            <StatTile label="Pool size" value={org.lettersAllowed} icon={<FileText className="h-5 w-5" />} />
            <StatTile label="Used" value={org.lettersUsed} icon={<FileText className="h-5 w-5" />} />
            <StatTile label="Seats" value={org.seatsAllowed} icon={<Users className="h-5 w-5" />} />
          </div>
        </CardContent>
      </Card>

      {org.isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Members ({members.length}/{org.seatsAllowed})
            </CardTitle>
            <CardDescription>
              Invite teammates who already have a TTML account. They draw from the shared pool.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (!inviteEmail.trim()) return;
                invite.mutate({ email: inviteEmail.trim(), role: "member" });
              }}
            >
              <Input
                type="email"
                placeholder="teammate@firm.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                data-testid="input-invite-email"
                disabled={invite.isPending}
              />
              <Button
                type="submit"
                disabled={invite.isPending || !inviteEmail.trim()}
                data-testid="button-invite-member"
              >
                {invite.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Invite
              </Button>
            </form>

            <div className="divide-y rounded-lg border">
              {members.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No members yet.</div>
              ) : (
                members.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between p-3">
                    <div>
                      <div className="text-sm font-medium">{m.name ?? m.email ?? `User #${m.userId}`}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={m.role === "owner" ? "default" : "outline"}>{m.role}</Badge>
                      {m.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate({ userId: m.userId })}
                          data-testid={`button-remove-member-${m.userId}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function StartTeamCard() {
  const [orgName, setOrgName] = useState("");
  const [seats, setSeats] = useState<number>(TEAM_MIN_SEATS);

  const checkout = trpc.billing.createTeamCheckout.useMutation({
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (err) => toast.error("Could not start checkout", { description: err.message }),
  });

  const monthlyTotal = seats * TEAM_PLAN.pricePerSeat;
  const pooledLetters = seats * TEAM_PLAN.lettersPerSeat;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Start a team
        </CardTitle>
        <CardDescription>
          {TEAM_PLAN.pricePerSeatDisplay}/seat per month. Seats share one pooled
          allowance of {TEAM_PLAN.lettersPerSeat} letters each, and any member can draw from it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Organization name</label>
          <Input
            placeholder="Acme Law Firm"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            data-testid="input-org-name"
            maxLength={200}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Seats ({TEAM_MIN_SEATS}–{TEAM_MAX_SEATS})
          </label>
          <Input
            type="number"
            min={TEAM_MIN_SEATS}
            max={TEAM_MAX_SEATS}
            value={seats}
            onChange={(e) =>
              setSeats(
                Math.min(
                  TEAM_MAX_SEATS,
                  Math.max(TEAM_MIN_SEATS, Math.floor(Number(e.target.value) || TEAM_MIN_SEATS))
                )
              )
            }
            data-testid="input-seat-count"
          />
        </div>

        <div className="rounded-lg bg-muted p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly total</span>
            <span className="font-semibold">${monthlyTotal.toLocaleString()}/mo</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pooled letters / month</span>
            <span className="font-semibold">{pooledLetters}</span>
          </div>
        </div>

        <Button
          className="w-full"
          disabled={checkout.isPending || !orgName.trim()}
          onClick={() => checkout.mutate({ orgName: orgName.trim(), seats })}
          data-testid="button-start-team-checkout"
        >
          {checkout.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Continue to checkout
        </Button>
      </CardContent>
    </Card>
  );
}
