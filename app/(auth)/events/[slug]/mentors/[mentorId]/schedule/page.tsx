import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import {
  getMentorProfile,
  getSlotsByMentor,
  getBookingsForMentor,
  generateMentorSlots,
} from "@/lib/actions/mentors";
import { SlotGrid } from "@/components/mentors/slot-grid";
import { SlotGeneratorForm } from "@/components/mentors/slot-generator-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const fmt = (d: Date | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : undefined;

export default async function MentorSchedulePage({
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
  if (mentor.userId !== session.user.id && !admin) redirect("/dashboard");

  const [slots, bookings] = await Promise.all([
    getSlotsByMentor(mentorId),
    getBookingsForMentor(mentorId),
  ]);

  const generateAction = generateMentorSlots.bind(null, mentorId);

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" className="text-slate-400 hover:text-white">
            <Link href={`/events/${slug}/mentors/${mentorId}` as Route}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Link>
          </Button>
        </div>

        <h1 className="mb-1 text-2xl font-bold">My Schedule</h1>
        <p className="mb-6 text-sm text-slate-400">
          Slot duration for this event: <strong className="text-white">{event.mentorSlotDuration} min</strong>
        </p>

        {/* Slot generator */}
        <div className="mb-8">
          <SlotGeneratorForm
            action={generateAction}
            eventStartDate={fmt(event.startsAt)}
            eventEndDate={fmt(event.endsAt)}
          />
        </div>

        {/* Slot grid — mentor view (can delete unbooked) */}
        <h2 className="mb-4 text-lg font-semibold">
          My Slots
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({slots.length} total, {slots.filter((s) => s.booking).length} booked)
          </span>
        </h2>
        <SlotGrid slots={slots} isMentor />

        {/* Booked sessions detail */}
        {bookings.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-lg font-semibold">Booked Sessions</h2>
            <div className="space-y-3">
              {bookings.map(({ booking, slot, team }) => (
                <div
                  key={booking.id}
                  className="rounded-xl border border-violet-700/40 bg-violet-900/10 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-violet-200">{team.name}</p>
                      <p className="text-sm text-slate-400">
                        {new Date(slot.startsAt).toLocaleString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" – "}
                        {new Date(slot.endsAt).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {team.description && (
                        <p className="mt-1 text-xs text-slate-500">{team.description}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        team.status === "registered"
                          ? "bg-green-900/30 text-green-300"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {team.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
