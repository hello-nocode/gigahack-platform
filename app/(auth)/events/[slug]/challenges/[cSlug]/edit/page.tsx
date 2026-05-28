import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import { getChallengeBySlug, getCriteriaForChallenge, getPrizesForChallenge } from "@/lib/actions/challenges";
import { getPartnerProfileForUser } from "@/lib/actions/partners";
import { EditChallengeFormWrapper } from "@/components/challenges/edit-challenge-form-wrapper";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function EditChallengePage({
  params,
}: {
  params: Promise<{ slug: string; cSlug: string }>;
}) {
  const { slug, cSlug } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const [challenge, admin, partnerProfile] = await Promise.all([
    getChallengeBySlug(event.id, cSlug),
    isAdmin(session.user.id),
    getPartnerProfileForUser(session.user.id, event.id),
  ]);
  if (!challenge) notFound();

  const isOwner = partnerProfile?.id === challenge.partnerId;
  if (!admin && !isOwner) redirect("/dashboard");

  const [criteria, prizes] = await Promise.all([
    getCriteriaForChallenge(challenge.id),
    getPrizesForChallenge(challenge.id),
  ]);

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4 text-slate-400 hover:text-white">
            <Link href={`/events/${slug}/challenges/${cSlug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Challenge
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Edit Challenge</h1>
          <p className="mt-1 text-sm text-slate-400">{challenge.title}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
          <EditChallengeFormWrapper
            challenge={challenge}
            criteria={criteria}
            prizes={prizes}
            eventId={event.id}
            eventSlug={slug}
            isAdmin={admin}
          />
        </div>
      </div>
    </main>
  );
}
