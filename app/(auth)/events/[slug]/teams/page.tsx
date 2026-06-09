import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import { getTeamsForEvent, getUserTeamInEvent, getUserJoinRequestsForEvent } from "@/lib/actions/teams";
import { RequestJoinButton } from "@/components/teams/request-join-button";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Users } from "lucide-react";

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const [teamList, admin, userTeam, myRequests] = await Promise.all([
    getTeamsForEvent(event.id),
    isAdmin(session.user.id),
    getUserTeamInEvent(event.id),
    getUserJoinRequestsForEvent(event.id),
  ]);

  const requestByTeam = Object.fromEntries(myRequests.map((r) => [r.teamId, r]));

  return (
    <main className="gh-page">
      <div className="gh-page-inner">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost">
            <Link href={`/events/${slug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Event</Link>
          </Button>
          {!userTeam && (
            <Button asChild>
              <Link href={`/events/${slug}/teams/new`}><Plus className="mr-2 h-4 w-4" />Create Team</Link>
            </Button>
          )}
        </div>

        <p className="gh-kicker mb-1">» Teams</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em", marginBottom: "4px" }}>Teams</h1>
        <p style={{ marginBottom: "28px", fontSize: "13px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{teamList.length} team{teamList.length !== 1 ? "s" : ""} registered</p>

        {userTeam && (
          <div className="mb-6 p-5" style={{ background: "var(--green-veil)", border: "1px solid var(--green)" }}>
            <p className="gh-kicker mb-2">» Your team</p>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontWeight: 600, color: "var(--fg-1)" }}>{userTeam.name}</p>
                <p style={{ fontSize: "13px", color: "var(--fg-3)" }}>{userTeam.members.length} member{userTeam.members.length !== 1 ? "s" : ""}</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/events/${slug}/teams/${userTeam.id}`}>View</Link>
              </Button>
            </div>
          </div>
        )}

        {teamList.filter((t) => t.id !== userTeam?.id).length === 0 ? (
          <div className="p-16 text-center" style={{ border: "1px dashed var(--border-strong)" }}>
            <Users className="mx-auto mb-4 h-10 w-10" style={{ color: "var(--fg-faint)" }} />
            <p style={{ color: "var(--fg-3)" }}>No teams yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {teamList.filter((t) => t.id !== userTeam?.id).map((team) => (
              <div key={team.id} className="gh-card flex items-center justify-between px-6 py-4">
                <div>
                  <p style={{ fontWeight: 600 }}>{team.name}</p>
                  <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: team.status === "registered" ? "var(--green)" : team.status === "disqualified" ? "var(--danger)" : "var(--fg-3)" }}>{team.status}</span>
                </div>
                {admin || team.leaderId === session.user?.id ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/events/${slug}/teams/${team.id}`}>View</Link>
                  </Button>
                ) : !userTeam ? (
                  <RequestJoinButton
                    teamId={team.id}
                    existingRequestId={requestByTeam[team.id]?.id}
                    existingStatus={requestByTeam[team.id]?.status}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
