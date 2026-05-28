import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import { getPartnerProfile, getPartnerProfileForUser } from "@/lib/actions/partners";
import {
  getChallengesForEvent,
  getPrizesForChallenge,
  getAcceptedApplicationCountForChallenge,
  getTeamApplicationStatus,
} from "@/lib/actions/challenges";
import { getUserTeamForEvent, getTeamApplications } from "@/lib/actions/teams";
import { ApplyButton } from "@/components/challenges/apply-button";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, ExternalLink, Pencil, Trophy } from "lucide-react";

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

export default async function PartnerProfilePage({
  params,
}: {
  params: Promise<{ slug: string; partnerId: string }>;
}) {
  const { slug, partnerId } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const [partner, admin, allChallenges, userPartner] = await Promise.all([
    getPartnerProfile(partnerId),
    isAdmin(session.user.id),
    getChallengesForEvent(event.id),
    getPartnerProfileForUser(session.user.id, event.id),
  ]);
  if (!partner) notFound();

  const isOwner = partner.userId === session.user.id;
  const isParticipant = !admin && !userPartner;

  // Filter challenges based on user role
  const visibleChallenges = admin || isOwner
    ? allChallenges.filter((c) => c.partnerId === partnerId)
    : allChallenges.filter((c) => c.partnerId === partnerId && c.status === "published");

  // For participants, enrich challenges with prizes and application status
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

    enrichedChallenges = await Promise.all(
      visibleChallenges.map(async (c) => {
        const [prizes, acceptedCount, teamStatus] = await Promise.all([
          getPrizesForChallenge(c.id),
          getAcceptedApplicationCountForChallenge(c.id),
          userTeamId ? getTeamApplicationStatus(userTeamId, c.id) : null,
        ]);

        return {
          challenge: {
            id: c.id,
            title: c.title,
            slug: c.slug,
            description: c.description,
            maxTeams: c.maxTeams,
            status: c.status,
            partnerId: c.partnerId,
          },
          prizes: prizes.map((p) => ({ id: p.id, place: p.place, value: p.value })),
          acceptedCount,
          teamStatus,
        };
      })
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" className="text-slate-400 hover:text-white">
            <Link href={`/events/${slug}/partners`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              All Partners
            </Link>
          </Button>
          {(isOwner || admin) && (
            <Button asChild variant="outline" className="border-slate-500 bg-slate-800 text-white hover:bg-slate-700 hover:text-white">
              <Link href={`/events/${slug}/partners/${partnerId}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Profile
              </Link>
            </Button>
          )}
        </div>

        <div className="mb-8 rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
          <div className="flex items-start gap-6">
            {partner.logoUrl ? (
              <img
                src={partner.logoUrl}
                alt={partner.companyName}
                className="h-20 w-20 rounded-xl object-contain"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-700">
                <Building2 className="h-10 w-10 text-slate-400" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{partner.companyName}</h1>
              {partner.website && (
                <a
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 text-sm text-blue-400 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {partner.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
          {partner.description && (
            <p className="mt-6 text-slate-300">{partner.description}</p>
          )}
        </div>

        <h2 className="mb-4 text-xl font-semibold">Challenges</h2>
        {visibleChallenges.length === 0 ? (
          <p className="text-slate-500">No challenges yet.</p>
        ) : isParticipant ? (
          // Participant view - rich challenge cards with Apply buttons
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
                  {/* Title and description */}
                  <Link
                    href={`/events/${slug}/challenges/${c.challenge.slug}`}
                    className="group block"
                  >
                    <h3 className="text-xl font-semibold group-hover:text-blue-400 transition-colors">
                      {c.challenge.title}
                    </h3>
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
          // Admin/Owner view - show all challenges with status
          <div className="space-y-3">
            {visibleChallenges.map((c) => (
              <Link
                key={c.id}
                href={`/events/${slug}/challenges/${c.slug}`}
                className="block rounded-xl border border-slate-700 bg-slate-800/50 p-5 transition-colors hover:border-slate-500"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{c.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    c.status === "published"
                      ? "bg-green-900/60 text-green-300"
                      : c.status === "archived"
                        ? "bg-slate-700 text-slate-400"
                        : "bg-yellow-900/60 text-yellow-300"
                  }`}>
                    {c.status}
                  </span>
                </div>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                    {c.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}

        {(isOwner || admin) && (
          <div className="mt-6">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href={`/events/${slug}/challenges/new?partnerId=${partnerId}`}>
                Add Challenge
              </Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
