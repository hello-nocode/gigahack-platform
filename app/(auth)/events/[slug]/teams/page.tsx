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
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" className="text-slate-400 hover:text-white">
            <Link href={`/events/${slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Link>
          </Button>
          {!userTeam && (
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href={`/events/${slug}/teams/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Link>
            </Button>
          )}
        </div>

        <h1 className="mb-2 text-3xl font-bold">Teams</h1>
        <p className="mb-8 text-slate-400">{teamList.length} team{teamList.length !== 1 ? "s" : ""} registered</p>

        {userTeam && (
          <div className="mb-6 rounded-xl border border-blue-700/50 bg-blue-900/20 p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-400">Your team</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{userTeam.name}</p>
                <p className="text-sm text-slate-400">{userTeam.members.length} member{userTeam.members.length !== 1 ? "s" : ""}</p>
              </div>
              <Button asChild variant="outline" size="sm" className="border-slate-500 bg-slate-800 text-white hover:bg-slate-700 hover:text-white">
                <Link href={`/events/${slug}/teams/${userTeam.id}`}>View</Link>
              </Button>
            </div>
          </div>
        )}

        {teamList.filter((t) => t.id !== userTeam?.id).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-16 text-center">
            <Users className="mx-auto mb-4 h-10 w-10 text-slate-600" />
            <p className="text-slate-400">No teams yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamList.filter((t) => t.id !== userTeam?.id).map((team) => (
              <div key={team.id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-4">
                <div>
                  <p className="font-semibold">{team.name}</p>
                  <span className={`text-xs font-medium ${
                    team.status === "registered" ? "text-green-400" :
                    team.status === "disqualified" ? "text-red-400" : "text-slate-400"
                  }`}>{team.status}</span>
                </div>
                {admin || team.leaderId === session.user?.id ? (
                  <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-white">
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
