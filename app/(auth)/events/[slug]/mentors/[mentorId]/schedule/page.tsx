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
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "48rem" }}>
        <div className="mb-6">
          <Button asChild variant="ghost">
            <Link href={`/events/${slug}/mentors/${mentorId}` as Route}><ArrowLeft className="mr-2 h-4 w-4" />Back to Profile</Link>
          </Button>
        </div>
        <p className="gh-kicker mb-1">» Schedule</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "24px", letterSpacing: "-0.02em", marginBottom: "4px" }}>{mentor.firstName} {mentor.lastName}&apos;s Schedule</h1>
        <p style={{ marginBottom: "24px", fontSize: "13px", color: "var(--fg-3)" }}>
          Slot duration: <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>{event.mentorSlotDuration} min</span>
        </p>

        <div className="mb-8">
          <SlotGeneratorForm action={generateAction} eventStartDate={fmt(event.startsAt)} eventEndDate={fmt(event.endsAt)} />
        </div>

        <p className="gh-kicker mb-4">» Slots <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>({slots.length} total, {slots.filter((s) => s.booking).length} booked)</span></p>
        <SlotGrid slots={slots} isMentor />

        {bookings.length > 0 && (() => {
          const grouped = new Map<string, { team: typeof bookings[0]["team"]; sessions: typeof bookings }>();
          for (const b of bookings) {
            const existing = grouped.get(b.team.id);
            if (existing) { existing.sessions.push(b); }
            else { grouped.set(b.team.id, { team: b.team, sessions: [b] }); }
          }
          return (
            <div className="mt-8">
              <p className="gh-kicker mb-4">» Booked Sessions</p>
              <div className="space-y-3">
                {Array.from(grouped.values()).map(({ team, sessions }) => (
                  <div key={team.id} className="gh-card p-4">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <p style={{ fontWeight: 600 }}>{team.name}</p>
                        {team.description && <p style={{ marginTop: "2px", fontSize: "12px", color: "var(--fg-faint)" }}>{team.description}</p>}
                      </div>
                      <span style={{ flexShrink: 0, padding: "2px 8px", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", background: team.status === "registered" ? "var(--green-veil)" : "var(--surface-3)", color: team.status === "registered" ? "var(--green)" : "var(--fg-faint)" }}>{team.status}</span>
                    </div>
                    <div className="space-y-1" style={{ borderTop: "1px solid var(--line)", paddingTop: "10px" }}>
                      {sessions.map(({ booking, slot }) => (
                        <p key={booking.id} style={{ fontSize: "13px", color: "var(--fg-2)", fontFamily: "var(--font-mono)" }}>
                          {new Date(slot.startsAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          {" – "}
                          {new Date(slot.endsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </main>
  );
}
