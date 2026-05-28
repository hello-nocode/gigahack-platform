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
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Events</h1>
            <p className="mt-1 text-sm text-slate-400">All Gigahack hackathon editions</p>
          </div>
          {admin && (
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/events/new">
                <Plus className="mr-2 h-4 w-4" />
                New Event
              </Link>
            </Button>
          )}
        </div>

        {eventList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-16 text-center">
            <CalendarDays className="mx-auto mb-4 h-10 w-10 text-slate-600" />
            <p className="text-slate-400">No events yet.</p>
            {admin && (
              <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
                <Link href="/events/new">Create the first event</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {eventList.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="block rounded-xl border border-slate-700 bg-slate-800/50 p-6 transition-colors hover:border-slate-500 hover:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold">{event.title}</h2>
                      <EventStatusBadge status={event.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {event.year}
                      {event.startsAt && (
                        <>
                          {" · "}
                          {new Date(event.startsAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {event.endsAt && (
                            <>
                              {" – "}
                              {new Date(event.endsAt).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-sm text-slate-500">
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
