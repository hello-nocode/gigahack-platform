import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import { getTeamWithMembers, getTeamApplications, getJoinRequestsForTeam } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Lock } from "lucide-react";
import { RemoveMemberButton } from "@/components/teams/remove-member-button";
import { JoinRequestsPanel } from "@/components/teams/join-requests-panel";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ slug: string; teamId: string }>;
}) {
  const { slug, teamId } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const [team, admin] = await Promise.all([
    getTeamWithMembers(teamId),
    isAdmin(session.user.id),
  ]);
  if (!team) notFound();

  const isLeader = team.leaderId === session.user.id;
  const isMember = team.members.some((m) => m.userId === session.user?.id);
  const isCompleted = event.status === "completed";
  if (!isMember && !admin) redirect(`/events/${slug}/teams`);

  const [applications, joinRequests] = await Promise.all([
    getTeamApplications(teamId),
    isLeader || admin ? getJoinRequestsForTeam(teamId) : Promise.resolve([]),
  ]);

  const pendingRequests = joinRequests.filter((r) => r.status === "pending");

  return (
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "48rem" }}>
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost">
            <Link href={`/events/${slug}/teams`}><ArrowLeft className="mr-2 h-4 w-4" />All Teams</Link>
          </Button>
          {isLeader && !isCompleted && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/events/${slug}/teams/${teamId}/edit`}><Pencil className="mr-2 h-4 w-4" />Edit</Link>
            </Button>
          )}
        </div>

        {isCompleted && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3" style={{ border: "1px solid var(--border)", background: "var(--surface-2)", fontSize: "13px", color: "var(--fg-3)" }}>
            <Lock style={{ width: 14, height: 14, flexShrink: 0 }} />
            This event is completed. All data is read-only.
          </div>
        )}

        <div className="mb-4 gh-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "26px", letterSpacing: "-0.02em" }}>{team.name}</h1>
              {team.description && <p style={{ marginTop: "8px", fontSize: "14px", color: "var(--fg-3)" }}>{team.description}</p>}
              <span style={{ marginTop: "10px", display: "inline-block", padding: "2px 8px", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", background: team.status === "registered" ? "var(--green-veil)" : team.status === "disqualified" ? "rgba(255,71,87,0.1)" : "var(--surface-3)", color: team.status === "registered" ? "var(--green)" : team.status === "disqualified" ? "var(--danger)" : "var(--fg-faint)" }}>{team.status}</span>
            </div>
          </div>
        </div>

        <div className="mb-4 gh-card p-6">
          <p className="gh-kicker mb-4">» Members ({team.members.length}/{event.maxTeamSize})</p>
          <div className="space-y-2">
            {team.members.map((m) => {
              const avatar = m.avatarUrl ?? m.image;
              return (
                <div key={m.id} className="flex items-center justify-between px-4 py-3" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
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
                      {isLeader && m.phone && <p style={{ fontSize: "12px", color: "var(--fg-3)" }}>{m.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.role === "leader" && (
                      <span style={{ padding: "1px 6px", fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--green)", background: "var(--green-veil)", border: "1px solid var(--green)" }}>Leader</span>
                    )}
                    {isLeader && !isCompleted && m.userId !== session.user?.id && (
                      <RemoveMemberButton teamId={teamId} memberId={m.userId} memberName={m.name ?? m.email ?? "this member"} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="gh-card p-6">
          <p className="gh-kicker mb-4">» Challenge Applications</p>
          {applications.length > 0 ? (
            <div className="space-y-2">
              {applications.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
                  <div>
                    <Link href={`/events/${slug}/challenges/${a.challengeSlug}`} style={{ fontSize: "14px", fontWeight: 500 }} className="hover:underline">{a.challengeTitle}</Link>
                    {a.note && <p style={{ fontSize: "12px", color: "var(--fg-3)", marginTop: "2px" }}>{a.note}</p>}
                  </div>
                  <span style={{ padding: "2px 8px", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", background: a.status === "accepted" ? "var(--green-veil)" : a.status === "rejected" ? "rgba(255,71,87,0.1)" : a.status === "withdrawn" ? "var(--surface-3)" : "rgba(232,229,83,0.1)", color: a.status === "accepted" ? "var(--green)" : a.status === "rejected" ? "var(--danger)" : a.status === "withdrawn" ? "var(--fg-faint)" : "var(--warn)" }}>{a.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "13px", color: "var(--fg-faint)" }}>No challenge applications yet.</p>
          )}
        </div>

        {(isLeader || admin) && !isCompleted && (
          <JoinRequestsPanel requests={pendingRequests} />
        )}
      </div>
    </main>
  );
}
