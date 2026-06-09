import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getEventBySlug } from "@/lib/actions/events";
import { getUserTeamInEvent } from "@/lib/actions/teams";
import { TeamForm } from "@/components/teams/team-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewTeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const userTeam = await getUserTeamInEvent(event.id);
  if (userTeam) redirect(`/events/${slug}/teams/${userTeam.id}`);

  return (
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "32rem" }}>
        <Button asChild variant="ghost" className="mb-6">
          <Link href={`/events/${slug}/teams`}><ArrowLeft className="mr-2 h-4 w-4" />All Teams</Link>
        </Button>
        <p className="gh-kicker mb-1">» New Team</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em", marginBottom: "6px" }}>Create a Team</h1>
        <p style={{ marginBottom: "28px", fontSize: "13px", color: "var(--fg-3)" }}>
          You&apos;ll be the team leader. Share your invite code to add members (max {event.maxTeamSize}).
        </p>
        <div className="gh-card p-8">
          <TeamForm eventId={event.id} eventSlug={slug} />
        </div>
      </div>
    </main>
  );
}
