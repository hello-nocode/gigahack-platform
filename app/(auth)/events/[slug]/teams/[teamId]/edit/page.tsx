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
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-xl">
        <Button asChild variant="ghost" className="mb-6 text-slate-400 hover:text-white">
          <Link href={`/events/${slug}/teams/${teamId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Team
          </Link>
        </Button>
        <h1 className="mb-8 text-3xl font-bold">Edit Team</h1>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
          <TeamForm
            eventId={event.id}
            eventSlug={slug}
            defaultValues={team}
            memberCount={team.members?.length ?? 0}
            minTeamSize={event.minTeamSize}
            maxTeamSize={event.maxTeamSize}
          />
        </div>

        {/* Transfer Leadership Section */}
        {isLeader && nonLeaderMembers.length > 0 && (
          <div className="mt-6 rounded-2xl border border-yellow-700/30 bg-yellow-900/10 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-yellow-200">
              <Crown className="h-5 w-5" /> Transfer Leadership
            </h2>
            <p className="mb-4 text-sm text-slate-400">
              Choose a new team leader. You will become a regular member.
            </p>
            <div className="space-y-2">
              {nonLeaderMembers.map((m) => {
                const avatar = m.avatarUrl ?? m.image;
                return (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3"
                  >
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
                      </div>
                    </div>
                    <TransferLeaderButton
                      teamId={teamId}
                      memberId={m.userId}
                      memberName={m.name ?? m.email ?? "this member"}
                    />
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
