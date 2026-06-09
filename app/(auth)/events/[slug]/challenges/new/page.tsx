import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import { getPartnerProfileForUser } from "@/lib/actions/partners";
import { NewChallengeFormWrapper } from "@/components/challenges/new-challenge-form-wrapper";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewChallengePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ partnerId?: string }>;
}) {
  const { slug } = await params;
  const { partnerId } = await searchParams;

  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const [admin, partnerProfile] = await Promise.all([
    isAdmin(session.user.id),
    getPartnerProfileForUser(session.user.id, event.id),
  ]);

  if (!admin && !partnerProfile) redirect("/dashboard");

  const effectivePartnerId = partnerId ?? partnerProfile?.id;
  if (!effectivePartnerId) redirect(`/events/${slug}`);

  return (
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "48rem" }}>
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href={`/events/${slug}/challenges`}><ArrowLeft className="mr-2 h-4 w-4" />All Challenges</Link>
          </Button>
          <p className="gh-kicker mb-1">» New Challenge</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em" }}>New Challenge</h1>
          <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--fg-3)" }}>Create a challenge for {event.title}</p>
        </div>
        <div className="gh-card p-8">
          <NewChallengeFormWrapper eventId={event.id} eventSlug={slug} partnerId={effectivePartnerId} />
        </div>
      </div>
    </main>
  );
}
