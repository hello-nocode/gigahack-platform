import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import {
  getChallengesForEvent,
  getPublishedChallengesWithDetails,
  getPrizesForChallenge,
  getAcceptedApplicationCountForChallenge,
  getTeamApplicationStatus,
} from "@/lib/actions/challenges";
import { getPartnerProfileForUser } from "@/lib/actions/partners";
import { getUserTeamForEvent, getTeamApplications } from "@/lib/actions/teams";
import { ApplyButton } from "@/components/challenges/apply-button";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lightbulb, Plus, Trophy } from "lucide-react";

interface ChallengeWithDetails {
  challenge: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    maxTeams: number | null;
    status: string;
    partnerId: string;
  };
  partner: {
    id: string;
    companyName: string;
    logoUrl: string | null;
  };
  prizes: Array<{
    id: string;
    place: string;
    value: string;
  }>;
  acceptedCount: number;
  teamStatus?: {
    id: string;
    status: string;
  } | null;
}

export default async function ChallengesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const [challengeList, admin, partnerProfile] = await Promise.all([
    getChallengesForEvent(event.id),
    isAdmin(session.user.id),
    getPartnerProfileForUser(session.user.id, event.id),
  ]);

  const canCreate = admin || !!partnerProfile;
  const isParticipant = !admin && !partnerProfile;

  // For participants, get their team and enrich challenges with partner info, prizes, and application status
  let userTeamId: string | null = null;
  let teamActiveApplications = 0;
  let enrichedChallenges: ChallengeWithDetails[] = [];

  if (isParticipant) {
    userTeamId = await getUserTeamForEvent(session.user.id, event.id);

    if (userTeamId) {
      const teamApps = await getTeamApplications(userTeamId);
      teamActiveApplications = teamApps.filter(
        (a) => a.status === "pending" || a.status === "accepted"
      ).length;
    }

    const publishedChallenges = await getPublishedChallengesWithDetails(event.id);

    enrichedChallenges = await Promise.all(
      publishedChallenges.map(async (c) => {
        const [prizes, acceptedCount, teamStatus] = await Promise.all([
          getPrizesForChallenge(c.challenge.id),
          getAcceptedApplicationCountForChallenge(c.challenge.id),
          userTeamId ? getTeamApplicationStatus(userTeamId, c.challenge.id) : null,
        ]);

        return {
          challenge: c.challenge,
          partner: c.partner,
          prizes: prizes.map((p) => ({ id: p.id, place: p.place, value: p.value })),
          acceptedCount,
          teamStatus,
        };
      })
    );
  }

  const visibleChallenges = admin
    ? challengeList
    : partnerProfile
    ? challengeList.filter(
        (c) =>
          c.status === "published" || c.partnerId === partnerProfile.id
      )
    : enrichedChallenges.map((c) => c.challenge);

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
          {canCreate && (
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href={`/events/${slug}/challenges/new${partnerProfile ? `?partnerId=${partnerProfile.id}` : ""}`}>
                <Plus className="mr-2 h-4 w-4" />
                New Challenge
              </Link>
            </Button>
          )}
        </div>

        <h1 className="mb-8 text-3xl font-bold">Challenges</h1>

        {visibleChallenges.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-16 text-center">
            <Lightbulb className="mx-auto mb-4 h-10 w-10 text-slate-600" />
            <p className="text-slate-400">No challenges published yet.</p>
          </div>
        ) : isParticipant ? (
          // Participant view - rich challenge cards with partner info and Apply buttons
          <div className="space-y-6">
            {enrichedChallenges.map((c) => {
              const isFull = c.challenge.maxTeams !== null && c.acceptedCount >= c.challenge.maxTeams;
              const alreadyApplied = !!c.teamStatus;
              const atApplicationLimit = teamActiveApplications >= event.maxChallengeApplications;

              let buttonDisabled = false;
              let buttonReason = "";

              if (!userTeamId) {
                buttonDisabled = true;
                buttonReason = "Join a team first";
              } else if (alreadyApplied) {
                buttonDisabled = true;
                buttonReason = c.teamStatus?.status === "accepted" ? "Accepted" : "Pending";
              } else if (atApplicationLimit) {
                buttonDisabled = true;
                buttonReason = "Max applications reached";
              }

              return (
                <div
                  key={c.challenge.id}
                  className="rounded-xl border border-slate-700 bg-slate-800/50 p-6"
                >
                  {/* Partner header */}
                  <div className="mb-4 flex items-center gap-3">
                    {c.partner.logoUrl ? (
                      <Image
                        src={c.partner.logoUrl}
                        alt={c.partner.companyName}
                        width={40}
                        height={40}
                        className="rounded-lg object-cover"
                      />
                    ) : null}
                    <span className="text-sm font-medium text-slate-300">
                      {c.partner.companyName}
                    </span>
                  </div>

                  {/* Title and description */}
                  <Link
                    href={`/events/${slug}/challenges/${c.challenge.slug}`}
                    className="group block"
                  >
                    <h2 className="text-xl font-semibold group-hover:text-blue-400 transition-colors">
                      {c.challenge.title}
                    </h2>
                    {c.challenge.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                        {c.challenge.description}
                      </p>
                    )}
                  </Link>

                  {/* Prizes */}
                  {c.prizes.length > 0 && (
                    <div className="mt-4 flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm text-slate-300">
                        {c.prizes.map((p) => `${p.place}: ${p.value} EUR`).join(", ")}
                      </span>
                    </div>
                  )}

                  {/* Footer with Apply button */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      {c.challenge.maxTeams && (
                        <span>{c.acceptedCount} / {c.challenge.maxTeams} teams</span>
                      )}
                    </div>
                    {userTeamId && !alreadyApplied ? (
                      <ApplyButton
                        teamId={userTeamId}
                        challengeId={c.challenge.id}
                        disabled={buttonDisabled}
                        disabledReason={buttonReason}
                        isFull={isFull}
                      />
                    ) : userTeamId && alreadyApplied ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        c.teamStatus?.status === "accepted"
                          ? "bg-green-900/60 text-green-300"
                          : "bg-yellow-900/60 text-yellow-300"
                      }`}>
                        {c.teamStatus?.status === "accepted" ? "Accepted" : "Pending"}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Join a team to apply</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Admin/Partner view - simple list with status pills
          <div className="space-y-4">
            {visibleChallenges.map((c) => (
              <Link
                key={c.id}
                href={`/events/${slug}/challenges/${c.slug}`}
                className="block rounded-xl border border-slate-700 bg-slate-800/50 p-6 transition-colors hover:border-slate-500 hover:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{c.title}</h2>
                    {c.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    c.status === "published"
                      ? "bg-green-900/60 text-green-300"
                      : c.status === "archived"
                        ? "bg-slate-700 text-slate-400"
                        : "bg-yellow-900/60 text-yellow-300"
                  }`}>
                    {c.status}
                  </span>
                </div>
                {c.maxTeams && (
                  <p className="mt-3 text-xs text-slate-500">Max {c.maxTeams} teams</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
