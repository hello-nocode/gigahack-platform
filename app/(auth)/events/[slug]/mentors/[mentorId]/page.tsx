import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import {
  getMentorProfile,
  getSlotsByMentor,
} from "@/lib/actions/mentors";
import { getUserTeamInEvent } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { SlotGrid } from "@/components/mentors/slot-grid";
import { ArrowLeft, Pencil, ExternalLink, Calendar } from "lucide-react";

export default async function MentorDetailPage({
  params,
}: {
  params: Promise<{ slug: string; mentorId: string }>;
}) {
  const { slug, mentorId } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const [mentor, admin] = await Promise.all([
    getMentorProfile(mentorId),
    isAdmin(session.user.id),
  ]);
  if (!mentor || mentor.eventId !== event.id) notFound();

  const isOwnProfile = mentor.userId === session.user.id;
  const userTeam = await getUserTeamInEvent(event.id);

  const slots = await getSlotsByMentor(mentorId);

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" className="text-slate-400 hover:text-white">
            <Link href={`/events/${slug}/mentors`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              All Mentors
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {(isOwnProfile || admin) && (
              <>
                <Button asChild size="sm" variant="outline" className="border-slate-500 bg-slate-800 text-white hover:bg-slate-700">
                  <Link href={`/events/${slug}/mentors/${mentorId}/edit` as Route}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit Profile
                  </Link>
                </Button>
                <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Link href={`/events/${slug}/mentors/${mentorId}/schedule` as Route}>
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    Manage Schedule
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Profile card */}
        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-start gap-5">
            {mentor.avatarUrl ? (
              <img
                src={mentor.avatarUrl}
                alt={`${mentor.firstName} ${mentor.lastName}`}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-600 shrink-0"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-700 text-3xl font-bold text-slate-400">
                {mentor.firstName?.[0] ?? "M"}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">
                {mentor.firstName} {mentor.lastName}
              </h1>
              {mentor.company && (
                <p className="mt-1 text-slate-400">{mentor.company}</p>
              )}
              {mentor.linkedinUrl && (
                <a
                  href={mentor.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-blue-400 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  LinkedIn
                </a>
              )}
            </div>
          </div>

          {mentor.expertise && (
            <div className="mt-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Expertise
              </p>
              <div className="flex flex-wrap gap-2">
                {mentor.expertise.split(",").map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-blue-700/40 bg-blue-900/20 px-2.5 py-0.5 text-xs text-blue-300"
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {mentor.bio && (
            <div className="mt-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                About
              </p>
              <p className="text-sm leading-relaxed text-slate-300">{mentor.bio}</p>
            </div>
          )}
        </div>

        {/* Slots */}
        <h2 className="mb-4 text-lg font-semibold">Available Sessions</h2>
        <SlotGrid
          slots={slots}
          teamId={userTeam?.id}
          myTeamId={userTeam?.id}
        />
      </div>
    </main>
  );
}
