import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@/lib/auth/config";
import { getEventBySlug } from "@/lib/actions/events";
import { getMentorsForEvent } from "@/lib/actions/mentors";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";

export default async function MentorsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const mentors = await getMentorsForEvent(event.id);

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" className="text-slate-400 hover:text-white">
            <Link href={`/events/${slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Link>
          </Button>
        </div>

        <h1 className="mb-2 text-3xl font-bold">Mentors</h1>
        <p className="mb-8 text-slate-400">
          {mentors.length} mentor{mentors.length !== 1 ? "s" : ""} available for {event.title}
        </p>

        {mentors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-16 text-center">
            <User className="mx-auto mb-4 h-10 w-10 text-slate-600" />
            <p className="text-slate-400">No mentors have joined yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {mentors.map((mentor) => (
              <Link
                key={mentor.id}
                href={`/events/${slug}/mentors/${mentor.id}` as Route}
                className="flex items-start gap-4 rounded-xl border border-slate-700 bg-slate-800/50 p-5 transition-colors hover:border-slate-500 hover:bg-slate-800"
              >
                {mentor.avatarUrl ? (
                  <img
                    src={mentor.avatarUrl}
                    alt={`${mentor.firstName} ${mentor.lastName}`}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-600 shrink-0"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xl font-bold text-slate-400">
                    {mentor.firstName?.[0] ?? "M"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    {mentor.firstName} {mentor.lastName}
                  </p>
                  {mentor.company && (
                    <p className="text-sm text-slate-400">{mentor.company}</p>
                  )}
                  {mentor.expertise && (
                    <p className="mt-1 truncate text-xs text-slate-500">{mentor.expertise}</p>
                  )}
                  <p className="mt-2 text-xs text-blue-400">
                    {mentor.availableSlots} slot{mentor.availableSlots !== 1 ? "s" : ""} available
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
