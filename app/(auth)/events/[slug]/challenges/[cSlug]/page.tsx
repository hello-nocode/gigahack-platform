import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import { getChallengeBySlug, getCriteriaForChallenge, getPrizesForChallenge } from "@/lib/actions/challenges";
import { getPartnerProfile, getPartnerProfileForUser } from "@/lib/actions/partners";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ slug: string; cSlug: string }>;
}) {
  const { slug, cSlug } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const [challenge, admin] = await Promise.all([
    getChallengeBySlug(event.id, cSlug),
    isAdmin(session.user.id),
  ]);
  if (!challenge) notFound();

  const [criteria, prizes, partner, userPartner] = await Promise.all([
    getCriteriaForChallenge(challenge.id),
    getPrizesForChallenge(challenge.id),
    getPartnerProfile(challenge.partnerId),
    getPartnerProfileForUser(session.user.id, event.id),
  ]);

  const isOwner = userPartner?.id === challenge.partnerId;
  const canEdit = admin || isOwner;
  const isParticipant = !admin && !isOwner;

  return (
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "48rem" }}>
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost">
            <Link href={`/events/${slug}/challenges`}><ArrowLeft className="mr-2 h-4 w-4" />All Challenges</Link>
          </Button>
          {canEdit && (
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/events/${slug}/challenges/${cSlug}/applications`}>Applications</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/events/${slug}/challenges/${cSlug}/edit`}><Pencil className="mr-2 h-4 w-4" />Edit</Link>
              </Button>
            </div>
          )}
        </div>

        <div className="gh-card p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em" }}>{challenge.title}</h1>
              {partner && (
                <Link href={`/events/${slug}/partners/${partner.id}`} style={{ marginTop: "4px", display: "block", fontSize: "13px", color: "var(--green)", fontFamily: "var(--font-mono)" }} className="hover:underline">
                  {partner.companyName}
                </Link>
              )}
            </div>
            {!isParticipant && (
              <span style={{ flexShrink: 0, padding: "3px 10px", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", background: challenge.status === "published" ? "var(--green-veil)" : challenge.status === "archived" ? "var(--surface-3)" : "rgba(232,229,83,0.1)", color: challenge.status === "published" ? "var(--green)" : challenge.status === "archived" ? "var(--fg-faint)" : "var(--warn)" }}>
                {challenge.status}
              </span>
            )}
          </div>

          {challenge.description && <Section title="Overview" content={challenge.description} />}
          {challenge.problemStatement && <Section title="Problem Statement" content={challenge.problemStatement} />}
          {challenge.expectedSolution && <Section title="Expected Solution" content={challenge.expectedSolution} />}
          {challenge.techRequirements && <Section title="Tech Requirements" content={challenge.techRequirements} />}

          {prizes.length > 0 && (
            <div className="mt-6">
              <p className="gh-kicker mb-3">» Prizes</p>
              <div className="space-y-2">
                {prizes.map((prize) => (
                  <div key={prize.id} className="flex items-center gap-3 px-4 py-3" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
                    <span style={{ fontWeight: 600, color: "var(--warn)" }}>{prize.place}</span>
                    <span style={{ color: "var(--fg-2)" }}>{prize.value} EUR</span>
                    <span style={{ marginLeft: "auto", padding: "1px 6px", fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--ink-650)", color: "var(--fg-3)" }}>{prize.type}</span>
                    {prize.numTeams > 1 && <span style={{ fontSize: "11px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>{prize.numTeams} teams</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {challenge.maxTeams && (
            <p style={{ marginTop: "20px", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>Maximum {challenge.maxTeams} teams can apply</p>
          )}
        </div>

        {criteria.length > 0 && (
          <div className="mt-4 gh-card p-8">
            <p className="gh-kicker mb-4">» Judging Criteria</p>
            <div className="space-y-3">
              {criteria.map((c) => (
                <div key={c.id} className="p-4" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between">
                    <h3 style={{ fontWeight: 500 }}>{c.name}</h3>
                    <div className="flex items-center gap-3">
                      {!isParticipant && <span style={{ fontSize: "12px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>Max: {c.maxScore}</span>}
                      <span style={{ padding: "1px 6px", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--green)", background: "var(--green-veil)", border: "1px solid var(--green)" }}>{c.weight}%</span>
                    </div>
                  </div>
                  {c.description && <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--fg-3)" }}>{c.description}</p>}
                </div>
              ))}
            </div>
            {!isParticipant && (
              <div className="mt-4 flex justify-between pt-4" style={{ borderTop: "1px solid var(--line)", fontSize: "13px" }}>
                <span style={{ color: "var(--fg-3)" }}>Total weight</span>
                <span style={{ fontWeight: 700, color: criteria.reduce((s, c) => s + c.weight, 0) === 100 ? "var(--green)" : "var(--danger)" }}>{criteria.reduce((s, c) => s + c.weight, 0)}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="mt-6">
      <p className="gh-kicker mb-2">» {title}</p>
      <p style={{ fontSize: "14px", color: "var(--fg-2)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{content}</p>
    </div>
  );
}
