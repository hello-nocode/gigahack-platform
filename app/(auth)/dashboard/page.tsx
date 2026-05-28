import Link from "next/link";
import type { Route } from "next";
import { auth } from "@/lib/auth/config";
import { getEvents, getEventBySlug } from "@/lib/actions/events";
import { getChallengesForEvent } from "@/lib/actions/challenges";
import { getPartnersForEvent } from "@/lib/actions/partners";
import { getTeamsForEvent } from "@/lib/actions/teams";
import { getRegistrationsForEvent } from "@/lib/actions/registrations";
import { getTicketStats } from "@/lib/actions/tickets";
import { getMentorsForEvent } from "@/lib/actions/mentors";
import { isAdmin } from "@/lib/permissions";
import { db } from "@db/index";
import { partnerProfiles } from "@db/schema";
import { eq } from "drizzle-orm";
import { EventSelector } from "@/components/dashboard/event-selector";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus, Pencil, Users, Building2, Lightbulb, Ticket, ClipboardList, GraduationCap } from "lucide-react";

const STATUS_ORDER = ["registration_open", "applications_open", "in_progress", "judging", "draft", "completed"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const { event: eventSlugParam } = await searchParams;

  const [eventList, admin, partnerList] = await Promise.all([
    getEvents(),
    userId ? isAdmin(userId) : Promise.resolve(false),
    userId ? db.select().from(partnerProfiles).where(eq(partnerProfiles.userId, userId)) : Promise.resolve([]),
  ]);

  if (admin) {
    // Pick the default event: most recent non-completed, else first
    const sortedEvents = [...eventList].sort(
      (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
    );
    const defaultEvent = sortedEvents[0] ?? eventList[0];
    const selectedSlug = eventSlugParam ?? defaultEvent?.slug ?? "";
    const event = selectedSlug ? await getEventBySlug(selectedSlug) : null;

    const [partners, challenges, teams, registrations, ticketStats, mentors] = event
      ? await Promise.all([
          getPartnersForEvent(event.id),
          getChallengesForEvent(event.id),
          getTeamsForEvent(event.id),
          getRegistrationsForEvent(event.id),
          getTicketStats(event.id),
          getMentorsForEvent(event.id),
        ])
      : [[], [], [], [], { total: 0, claimed: 0, unclaimed: 0 }, []];

    const approvedRegistrations = registrations.filter((r) => r.status === "approved").length;

    return (
      <main className="min-h-screen bg-slate-900 p-8 text-white">
        <div className="mx-auto max-w-4xl">
          {/* Header row */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <div className="flex items-center gap-3">
              <EventSelector
                events={eventList.map((e) => ({ slug: e.slug, title: e.title, year: e.year }))}
                selectedSlug={selectedSlug}
              />
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Link href="/events/new">
                  <Plus className="mr-1.5 h-4 w-4" />
                  New Event
                </Link>
              </Button>
            </div>
          </div>

          {event ? (
            <>
              {/* Event info card */}
              <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">{event.title}</h2>
                    <p className="mt-1 text-sm text-slate-400">Edition {event.year}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <EventStatusBadge status={event.status} />
                    <Button asChild size="sm" variant="outline" className="border-slate-500 bg-slate-800 text-white hover:bg-slate-700">
                      <Link href={`/events/${event.slug}/edit`}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Dates & settings */}
                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {event.startsAt && (
                    <InfoCard
                      label="Starts"
                      value={new Date(event.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    />
                  )}
                  {event.endsAt && (
                    <InfoCard
                      label="Ends"
                      value={new Date(event.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    />
                  )}
                  <InfoCard label="Timezone" value={event.timezone} />
                  <InfoCard label="Team Size" value={`${event.minTeamSize} – ${event.maxTeamSize} members`} />
                  <InfoCard label="Max Applications" value={`${event.maxChallengeApplications} per team`} />
                  <InfoCard label="Partner Apps" value={event.partnerApplicationsOpen ? "Open" : "Closed"} />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <StatCard icon={<ClipboardList className="h-4 w-4 text-blue-400" />} label="Approved" value={approvedRegistrations} href={`/events/${event.slug}/registrations`} />
                  <StatCard icon={<Ticket className="h-4 w-4 text-emerald-400" />} label="Tickets" value={`${ticketStats.claimed}/${ticketStats.total}`} href={`/events/${event.slug}/tickets`} />
                  <StatCard icon={<Users className="h-4 w-4 text-violet-400" />} label="Teams" value={teams.length} href={`/events/${event.slug}/teams`} />
                  <StatCard icon={<Building2 className="h-4 w-4 text-amber-400" />} label="Partners" value={partners.length} href={`/events/${event.slug}/partners`} />
                  <StatCard icon={<Lightbulb className="h-4 w-4 text-rose-400" />} label="Challenges" value={challenges.length} href={`/events/${event.slug}/challenges`} />
                  <StatCard icon={<GraduationCap className="h-4 w-4 text-teal-400" />} label="Mentors" value={mentors.length} href={`/events/${event.slug}/mentors`} />
                </div>
              </div>

              {/* Nav tabs */}
              <div className="flex flex-wrap gap-2">
                <NavTab href={`/events/${event.slug}`}>Overview</NavTab>
                <NavTab href={`/events/${event.slug}/registrations`}>
                  Registrations
                  <Badge>{approvedRegistrations}</Badge>
                </NavTab>
                <NavTab href={`/events/${event.slug}/tickets`}>
                  Tickets
                  <Badge>{ticketStats.claimed}/{ticketStats.total}</Badge>
                </NavTab>
                <NavTab href={`/events/${event.slug}/teams`}>
                  Teams
                  <Badge>{teams.length}</Badge>
                </NavTab>
                <NavTab href={`/events/${event.slug}/partners`}>
                  Partners
                  <Badge>{partners.length}</Badge>
                </NavTab>
                <NavTab href={`/events/${event.slug}/challenges`}>
                  Challenges
                  <Badge>{challenges.length}</Badge>
                </NavTab>
                <NavTab href={`/events/${event.slug}/mentors`}>
                  Mentors
                  <Badge>{mentors.length}</Badge>
                </NavTab>
                <NavTab href={`/admin/events/${event.id}/invites`}>Invites</NavTab>
                <NavTab href={`/admin/events/${event.id}/mentor-invites`}>Mentor Invites</NavTab>
                <NavTab href={`/admin/events/${event.id}/status`}>Status</NavTab>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-12 text-center">
              <CalendarDays className="mx-auto mb-4 h-10 w-10 text-slate-600" />
              <p className="text-slate-400">No events yet.</p>
              <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
                <Link href="/events/new">Create your first event</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── Non-admin view (unchanged) ────────────────────────────────────────────
  return (
    <main className="bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Welcome, {session?.user?.name ?? "there"}!</h1>
          <p className="mt-1 text-sm text-slate-400">{session?.user?.email}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/events"
            className="group rounded-xl border border-slate-700 bg-slate-800/50 p-6 transition-colors hover:border-slate-500 hover:bg-slate-800"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-lg bg-blue-600/20 p-2">
                <CalendarDays className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="font-semibold">Events</h2>
            </div>
            <p className="text-2xl font-bold">{eventList.length}</p>
            <p className="text-sm text-slate-400">
              {eventList.length === 1 ? "edition" : "editions"} total
            </p>
          </Link>
        </div>

        {partnerList.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-slate-200">Your Partner Profiles</h2>
            <div className="space-y-3">
              {partnerList.map((profile) => {
                const ev = eventList.find((e) => e.id === profile.eventId);
                if (!ev) return null;
                return (
                  <div key={profile.id} className="rounded-xl border border-violet-700/40 bg-violet-900/10 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-violet-200">{profile.companyName}</p>
                        <p className="text-sm text-slate-400">{ev.title} · {ev.year}</p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/events/${ev.slug}/partners/${profile.id}`}
                          className="rounded-md border border-slate-500 bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700"
                        >
                          Profile
                        </Link>
                        <Link
                          href={`/events/${ev.slug}/challenges`}
                          className="rounded-md bg-violet-600 px-3 py-1.5 text-xs text-white hover:bg-violet-700"
                        >
                          Challenges
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function StatCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number | string; href: string }) {
  return (
    <Link
      href={href as Route}
      className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-slate-500 hover:bg-slate-700/50"
    >
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {icon}
        {label}
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </Link>
  );
}

function NavTab({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href as Route}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white"
    >
      {children}
    </Link>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">
      {children}
    </span>
  );
}
