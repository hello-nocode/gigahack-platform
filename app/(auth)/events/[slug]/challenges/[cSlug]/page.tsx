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
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" className="text-slate-400 hover:text-white">
            <Link href={`/events/${slug}/challenges`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              All Challenges
            </Link>
          </Button>
          {canEdit && (
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="border-slate-500 bg-slate-800 text-white hover:bg-slate-700 hover:text-white">
                <Link href={`/events/${slug}/challenges/${cSlug}/applications`}>
                  Applications
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="border-slate-500 bg-slate-800 text-white hover:bg-slate-700 hover:text-white">
                <Link href={`/events/${slug}/challenges/${cSlug}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{challenge.title}</h1>
              {partner && (
                <Link
                  href={`/events/${slug}/partners/${partner.id}`}
                  className="mt-1 text-sm text-blue-400 hover:underline"
                >
                  {partner.companyName}
                </Link>
              )}
            </div>
            {!isParticipant && (
              <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${
                challenge.status === "published"
                  ? "bg-green-900/60 text-green-300"
                  : challenge.status === "archived"
                    ? "bg-slate-700 text-slate-400"
                    : "bg-yellow-900/60 text-yellow-300"
              }`}>
                {challenge.status}
              </span>
            )}
          </div>

          {challenge.description && (
            <Section title="Overview" content={challenge.description} />
          )}
          {challenge.problemStatement && (
            <Section title="Problem Statement" content={challenge.problemStatement} />
          )}
          {challenge.expectedSolution && (
            <Section title="Expected Solution" content={challenge.expectedSolution} />
          )}
          {challenge.techRequirements && (
            <Section title="Tech Requirements" content={challenge.techRequirements} />
          )}

          {prizes.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 text-lg font-semibold">Prizes</h2>
              <div className="space-y-2">
                {prizes.map((prize) => (
                  <div key={prize.id} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
                    <span className="font-semibold text-yellow-400">{prize.place}</span>
                    <span className="text-slate-300">{prize.value} EUR</span>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                      prize.type === "cash" ? "bg-green-900/50 text-green-300" :
                      prize.type === "voucher" ? "bg-purple-900/50 text-purple-300" :
                      prize.type === "product" ? "bg-blue-900/50 text-blue-300" :
                      prize.type === "service" ? "bg-orange-900/50 text-orange-300" :
                      "bg-slate-700 text-slate-300"
                    }`}>
                      {prize.type}
                    </span>
                    {prize.numTeams > 1 && (
                      <span className="text-xs text-slate-500">{prize.numTeams} teams</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {challenge.maxTeams && (
            <p className="mt-6 text-sm text-slate-500">
              Maximum {challenge.maxTeams} teams can apply
            </p>
          )}
        </div>

        {criteria.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
            <h2 className="mb-4 text-xl font-semibold">Judging Criteria</h2>
            <div className="space-y-3">
              {criteria.map((c) => (
                <div key={c.id} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{c.name}</h3>
                    <div className="flex items-center gap-3 text-sm">
                      {!isParticipant && (
                        <span className="text-slate-400">Max: {c.maxScore}</span>
                      )}
                      <span className="rounded-full bg-blue-900/50 px-2 py-0.5 text-blue-300 font-semibold">
                        {c.weight}%
                      </span>
                    </div>
                  </div>
                  {c.description && (
                    <p className="mt-1 text-sm text-slate-400">{c.description}</p>
                  )}
                </div>
              ))}
            </div>
            {!isParticipant && (
              <div className="mt-4 flex justify-between border-t border-slate-700 pt-4 text-sm">
                <span className="text-slate-400">Total weight</span>
                <span className={`font-bold ${criteria.reduce((s, c) => s + c.weight, 0) === 100 ? "text-green-400" : "text-red-400"}`}>
                  {criteria.reduce((s, c) => s + c.weight, 0)}%
                </span>
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
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <p className="whitespace-pre-wrap text-slate-300">{content}</p>
    </div>
  );
}
