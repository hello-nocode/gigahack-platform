import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import { getTeamWithMembers, getTeamApplications, getJoinRequestsForTeam, reviewJoinRequest } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Check, X, Lock } from "lucide-react";
import { RemoveMemberButton } from "@/components/teams/remove-member-button";

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
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" className="text-slate-400 hover:text-white">
            <Link href={`/events/${slug}/teams`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              All Teams
            </Link>
          </Button>
          {isLeader && !isCompleted && (
            <Button asChild variant="outlineDark" size="sm">
              <Link href={`/events/${slug}/teams/${teamId}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
        </div>

        {/* Read-only banner */}
        {isCompleted && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/50 px-4 py-3 text-sm text-slate-400">
            <Lock className="h-4 w-4 shrink-0" />
            This event is completed. All data is read-only.
          </div>
        )}

        {/* Header */}
        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{team.name}</h1>
              {team.description && <p className="mt-2 text-slate-400">{team.description}</p>}
              <span className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                team.status === "registered" ? "bg-green-900/50 text-green-300" :
                team.status === "disqualified" ? "bg-red-900/50 text-red-300" :
                "bg-slate-700 text-slate-400"
              }`}>{team.status}</span>
            </div>
          </div>

        </div>

        {/* Members */}
        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Members ({team.members.length}/{event.maxTeamSize})</h2>
          <div className="space-y-2">
            {team.members.map((m) => {
              const avatar = m.avatarUrl ?? m.image;
              return (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
                  <div className="flex items-center gap-3">
                    {avatar ? (
                      <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-300">
                        {(m.name ?? m.email ?? "?")[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{m.name ?? m.email}</p>
                      <p className="text-xs text-slate-500">{m.email}</p>
                      {isLeader && m.phone && (
                        <p className="text-xs text-slate-400">{m.phone}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.role === "leader" && (
                      <span className="rounded-full bg-blue-900/50 px-2 py-0.5 text-xs text-blue-300">Leader</span>
                    )}
                    {isLeader && !isCompleted && m.userId !== session.user?.id && (
                      <RemoveMemberButton
                        teamId={teamId}
                        memberId={m.userId}
                        memberName={m.name ?? m.email ?? "this member"}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Challenge Applications */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Challenge Applications</h2>

          {applications.length > 0 && (
            <div className="mb-4 space-y-2">
              {applications.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
                  <div>
                    <Link href={`/events/${slug}/challenges/${a.challengeSlug}`} className="text-sm font-medium hover:underline">
                      {a.challengeTitle}
                    </Link>
                    {a.note && <p className="text-xs text-slate-500">{a.note}</p>}
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    a.status === "accepted" ? "bg-green-900/50 text-green-300" :
                    a.status === "rejected" ? "bg-red-900/50 text-red-300" :
                    a.status === "withdrawn" ? "bg-slate-700 text-slate-400" :
                    "bg-yellow-900/50 text-yellow-300"
                  }`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}

          {applications.length === 0 && (
            <p className="text-sm text-slate-500">No challenge applications yet.</p>
          )}
        </div>

        {/* Join requests — leader only */}
        {(isLeader || admin) && !isCompleted && pendingRequests.length > 0 && (
          <div className="mt-6 rounded-2xl border border-yellow-700/40 bg-yellow-900/10 p-6">
            <h2 className="mb-4 text-lg font-semibold text-yellow-200">Join Requests ({pendingRequests.length})</h2>
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
                  <div className="flex items-center gap-3">
                    {req.image && <img src={req.image} alt="" className="h-8 w-8 rounded-full" />}
                    <div>
                      <p className="text-sm font-medium">{req.name ?? req.email}</p>
                      {req.message && <p className="text-xs text-slate-400 mt-0.5">{req.message}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={async () => {
                      "use server";
                      await reviewJoinRequest(req.id, "accepted");
                    }}>
                      <Button type="submit" size="sm" className="bg-green-700 hover:bg-green-600 h-8 px-3 text-xs">
                        <Check className="mr-1 h-3.5 w-3.5" /> Accept
                      </Button>
                    </form>
                    <form action={async () => {
                      "use server";
                      await reviewJoinRequest(req.id, "rejected");
                    }}>
                      <Button type="submit" size="sm" variant="outline" className="border-red-700 text-red-400 hover:bg-red-900/20 h-8 px-3 text-xs">
                        <X className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
