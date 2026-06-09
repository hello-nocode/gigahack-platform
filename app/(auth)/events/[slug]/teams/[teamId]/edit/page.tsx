import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import { getTeamWithMembers } from "@/lib/actions/teams";
import { TeamForm } from "@/components/teams/team-form";
import { TransferLeaderButton } from "@/components/teams/transfer-leader-button";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown } from "lucide-react";

export default async function EditTeamPage({
  params,
}: {
  params: Promise<{ slug: string; teamId: string }>;
}) {
  const { slug, teamId } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const [team, admin] = await Promise.all([getTeamWithMembers(teamId), isAdmin(session.user.id)]);
  if (!team) notFound();
  if (team.leaderId !== session.user.id && !admin) redirect("/dashboard");

  const isLeader = team.leaderId === session.user.id;
  const nonLeaderMembers = team.members?.filter((m) => m.userId !== team.leaderId) ?? [];

  return (
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "32rem" }}>
        <Button asChild variant="ghost" className="mb-6">
          <Link href={`/events/${slug}/teams/${teamId}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Team</Link>
        </Button>
        <p className="gh-kicker mb-1">» Edit Team</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em", marginBottom: "24px" }}>Edit Team</h1>
        <div className="gh-card p-8">
          <TeamForm eventId={event.id} eventSlug={slug} defaultValues={team} memberCount={team.members?.length ?? 0} minTeamSize={event.minTeamSize} maxTeamSize={event.maxTeamSize} />
        </div>

        {isLeader && nonLeaderMembers.length > 0 && (
          <div className="mt-6 p-6" style={{ background: "rgba(232,229,83,0.06)", border: "1px solid var(--warn)" }}>
            <p className="gh-kicker mb-2" style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--warn)" }}>
              <Crown style={{ width: 13, height: 13 }} /> Transfer Leadership
            </p>
            <p style={{ marginBottom: "14px", fontSize: "13px", color: "var(--fg-3)" }}>Choose a new team leader. You will become a regular member.</p>
            <div className="space-y-2">
              {nonLeaderMembers.map((m) => {
                const avatar = m.avatarUrl ?? m.image;
                return (
                  <div key={m.userId} className="flex items-center justify-between px-4 py-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-3">
                      {avatar ? (
                        <img src={avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink-650)", fontSize: "12px", fontWeight: 600 }}>
                          {(m.name ?? m.email ?? "?")[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: 500 }}>{m.name ?? m.email}</p>
                        <p style={{ fontSize: "12px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{m.email}</p>
                      </div>
                    </div>
                    <TransferLeaderButton teamId={teamId} memberId={m.userId} memberName={m.name ?? m.email ?? "this member"} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
