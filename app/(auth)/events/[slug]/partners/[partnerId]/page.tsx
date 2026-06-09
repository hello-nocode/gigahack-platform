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
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "48rem" }}>
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost">
            <Link href={`/events/${slug}/partners`}><ArrowLeft className="mr-2 h-4 w-4" />All Partners</Link>
          </Button>
          {(isOwner || admin) && (
            <Button asChild variant="outline">
              <Link href={`/events/${slug}/partners/${partnerId}/edit`}><Pencil className="mr-2 h-4 w-4" />Edit Profile</Link>
            </Button>
          )}
        </div>

        <div className="mb-6 gh-card p-8">
          <div className="flex items-start gap-6">
            {partner.logoUrl ? (
              <img src={partner.logoUrl} alt={partner.companyName} style={{ width: 72, height: 72, objectFit: "contain", flexShrink: 0, border: "1px solid var(--border)" }} />
            ) : (
              <div style={{ width: 72, height: 72, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink-650)", border: "1px solid var(--border)" }}>
                <Building2 style={{ width: 32, height: 32, color: "var(--fg-faint)" }} />
              </div>
            )}
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "26px", letterSpacing: "-0.02em" }}>{partner.companyName}</h1>
              {partner.website && (
                <a href={partner.website} target="_blank" rel="noopener noreferrer"
                  style={{ marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--green)", fontFamily: "var(--font-mono)" }}
                  className="hover:underline">
                  <ExternalLink style={{ width: 10, height: 10 }} />{partner.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
          {partner.description && <p style={{ marginTop: "20px", fontSize: "14px", color: "var(--fg-2)", lineHeight: 1.6 }}>{partner.description}</p>}
        </div>

        <p className="gh-kicker mb-4">» Challenges</p>
        {visibleChallenges.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--fg-faint)" }}>No challenges yet.</p>
        ) : isParticipant ? (
          <div className="space-y-4">
            {enrichedChallenges.map((c) => {
              const isFull = c.challenge.maxTeams !== null && c.acceptedCount >= c.challenge.maxTeams;
              const alreadyApplied = !!c.teamStatus;
              const atApplicationLimit = teamActiveApplications >= event.maxChallengeApplications;
              let buttonDisabled = false;
              let buttonReason = "";
              if (!userTeamId) { buttonDisabled = true; buttonReason = "Join a team first"; }
              else if (alreadyApplied) { buttonDisabled = true; buttonReason = c.teamStatus?.status === "accepted" ? "Accepted" : "Pending"; }
              else if (atApplicationLimit) { buttonDisabled = true; buttonReason = "Max applications reached"; }
              return (
                <div key={c.challenge.id} className="gh-card p-6">
                  <Link href={`/events/${slug}/challenges/${c.challenge.slug}`} className="group block">
                    <h3 style={{ fontSize: "18px", fontWeight: 600, fontFamily: "var(--font-display)" }} className="group-hover:underline">{c.challenge.title}</h3>
                    {c.challenge.description && <p style={{ marginTop: "6px", fontSize: "13px", color: "var(--fg-3)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.challenge.description}</p>}
                  </Link>
                  {c.prizes.length > 0 && (
                    <div className="mt-4 flex items-center gap-2">
                      <Trophy style={{ width: 14, height: 14, color: "var(--warn)", flexShrink: 0 }} />
                      <span style={{ fontSize: "13px", color: "var(--fg-2)", fontFamily: "var(--font-mono)" }}>{c.prizes.map((p) => `${p.place}: ${p.value} EUR`).join(", ")}</span>
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <div style={{ fontSize: "11px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
                      {c.challenge.maxTeams && <span>{c.acceptedCount} / {c.challenge.maxTeams} teams</span>}
                    </div>
                    {userTeamId && !alreadyApplied ? (
                      <ApplyButton teamId={userTeamId} challengeId={c.challenge.id} disabled={buttonDisabled} disabledReason={buttonReason} isFull={isFull} />
                    ) : userTeamId && alreadyApplied ? (
                      <span style={{ padding: "2px 8px", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", background: c.teamStatus?.status === "accepted" ? "var(--green-veil)" : "rgba(232,229,83,0.1)", color: c.teamStatus?.status === "accepted" ? "var(--green)" : "var(--warn)" }}>
                        {c.teamStatus?.status === "accepted" ? "Accepted" : "Pending"}
                      </span>
                    ) : (
                      <span style={{ fontSize: "12px", color: "var(--fg-faint)" }}>Join a team to apply</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleChallenges.map((c) => (
              <Link key={c.id} href={`/events/${slug}/challenges/${c.slug}`} className="gh-card-hover block px-5 py-4">
                <div className="flex items-center justify-between">
                  <h3 style={{ fontWeight: 500 }}>{c.title}</h3>
                  <span style={{ padding: "2px 8px", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", background: c.status === "published" ? "var(--green-veil)" : c.status === "archived" ? "var(--surface-3)" : "rgba(232,229,83,0.1)", color: c.status === "published" ? "var(--green)" : c.status === "archived" ? "var(--fg-faint)" : "var(--warn)" }}>{c.status}</span>
                </div>
                {c.description && <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--fg-3)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.description}</p>}
              </Link>
            ))}
          </div>
        )}

        {(isOwner || admin) && (
          <div className="mt-6">
            <Button asChild>
              <Link href={`/events/${slug}/challenges/new?partnerId=${partnerId}`}>Add Challenge</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
