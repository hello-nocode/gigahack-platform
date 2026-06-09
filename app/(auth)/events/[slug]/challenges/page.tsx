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
    <main className="gh-page">
      <div className="gh-page-inner">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost">
            <Link href={`/events/${slug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Event</Link>
          </Button>
          {canCreate && (
            <Button asChild>
              <Link href={`/events/${slug}/challenges/new${partnerProfile ? `?partnerId=${partnerProfile.id}` : ""}`}>
                <Plus className="mr-2 h-4 w-4" />New Challenge
              </Link>
            </Button>
          )}
        </div>

        <p className="gh-kicker mb-1">» Challenges</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em", marginBottom: "28px" }}>Challenges</h1>

        {visibleChallenges.length === 0 ? (
          <div className="p-16 text-center" style={{ border: "1px dashed var(--border-strong)" }}>
            <Lightbulb className="mx-auto mb-4 h-10 w-10" style={{ color: "var(--fg-faint)" }} />
            <p style={{ color: "var(--fg-3)" }}>No challenges published yet.</p>
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
                <div key={c.challenge.id} className="gh-card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    {c.partner.logoUrl ? (
                      <Image src={c.partner.logoUrl} alt={c.partner.companyName} width={36} height={36} style={{ objectFit: "cover" }} />
                    ) : null}
                    <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{c.partner.companyName}</span>
                  </div>

                  <Link href={`/events/${slug}/challenges/${c.challenge.slug}`} className="group block">
                    <h2 style={{ fontSize: "18px", fontWeight: 600, transition: "color 0.15s" }} className="group-hover:text-[var(--green)]">{c.challenge.title}</h2>
                    {c.challenge.description && (
                      <p style={{ marginTop: "6px", fontSize: "13px", color: "var(--fg-3)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.challenge.description}</p>
                    )}
                  </Link>

                  {c.prizes.length > 0 && (
                    <div className="mt-4 flex items-center gap-2">
                      <Trophy className="h-4 w-4" style={{ color: "var(--warn)" }} />
                      <span style={{ fontSize: "13px", color: "var(--fg-2)" }}>{c.prizes.map((p) => `${p.place}: ${p.value} EUR`).join(", ")}</span>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <div style={{ fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
                      {c.challenge.maxTeams && <span>{c.acceptedCount} / {c.challenge.maxTeams} teams</span>}
                    </div>
                    {userTeamId && !alreadyApplied ? (
                      <ApplyButton teamId={userTeamId} challengeId={c.challenge.id} disabled={buttonDisabled} disabledReason={buttonReason} isFull={isFull} />
                    ) : userTeamId && alreadyApplied ? (
                      <span style={{ padding: "2px 8px", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", background: c.teamStatus?.status === "accepted" ? "var(--green-veil)" : "rgba(232,229,83,0.1)", color: c.teamStatus?.status === "accepted" ? "var(--green)" : "var(--warn)", border: `1px solid ${c.teamStatus?.status === "accepted" ? "var(--green)" : "var(--warn)"}` }}>
                        {c.teamStatus?.status === "accepted" ? "Accepted" : "Pending"}
                      </span>
                    ) : (
                      <span style={{ fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>Join a team to apply</span>
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
              <Link key={c.id} href={`/events/${slug}/challenges/${c.slug}`} className="gh-card gh-card-hover block p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 style={{ fontSize: "16px", fontWeight: 600 }}>{c.title}</h2>
                    {c.description && (
                      <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--fg-3)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.description}</p>
                    )}
                  </div>
                  <span style={{ flexShrink: 0, padding: "2px 8px", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", background: c.status === "published" ? "var(--green-veil)" : c.status === "archived" ? "var(--ink-650)" : "rgba(232,229,83,0.1)", color: c.status === "published" ? "var(--green)" : c.status === "archived" ? "var(--fg-faint)" : "var(--warn)" }}>
                    {c.status}
                  </span>
                </div>
                {c.maxTeams && (
                  <p style={{ marginTop: "10px", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>Max {c.maxTeams} teams</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
