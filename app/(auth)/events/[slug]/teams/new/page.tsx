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
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-xl">
        <Button asChild variant="ghost" className="mb-6 text-slate-400 hover:text-white">
          <Link href={`/events/${slug}/teams`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Teams
          </Link>
        </Button>
        <h1 className="mb-2 text-3xl font-bold">Create a Team</h1>
        <p className="mb-8 text-slate-400">
          You&apos;ll be the team leader. Share your invite code to add members (max {event.maxTeamSize}).
        </p>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
          <TeamForm eventId={event.id} eventSlug={slug} />
        </div>
      </div>
    </main>
  );
}
