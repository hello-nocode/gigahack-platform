import Link from "next/link";
import { getEvents } from "@/lib/actions/events";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus } from "lucide-react";

export default async function EventsPage() {
  const [session, eventList] = await Promise.all([auth(), getEvents()]);
  const admin = session?.user?.id ? await isAdmin(session.user.id) : false;

  return (
    <main className="gh-page">
      <div className="gh-page-inner">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="gh-kicker mb-1">» Editions</p>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "32px", letterSpacing: "-0.02em" }}>Events</h1>
          </div>
          {admin && (
            <Button asChild>
              <Link href="/events/new"><Plus className="mr-2 h-4 w-4" />New Event</Link>
            </Button>
          )}
        </div>

        {eventList.length === 0 ? (
          <div className="p-16 text-center" style={{ border: "1px dashed var(--border-strong)" }}>
            <CalendarDays className="mx-auto mb-4 h-10 w-10" style={{ color: "var(--fg-faint)" }} />
            <p style={{ color: "var(--fg-3)" }}>No events yet.</p>
            {admin && <Button asChild className="mt-4"><Link href="/events/new">Create the first event</Link></Button>}
          </div>
        ) : (
          <div className="space-y-3">
            {eventList.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="gh-card gh-card-hover block p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 style={{ fontSize: "17px", fontWeight: 600 }}>{event.title}</h2>
                      <EventStatusBadge status={event.status} />
                    </div>
                    <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                      {event.year}
                      {event.startsAt && (
                        <>
                          {" · "}
                          {new Date(event.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {event.endsAt && <>{" – "}{new Date(event.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</>}
                        </>
                      )}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
                    Team {event.minTeamSize}–{event.maxTeamSize}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
