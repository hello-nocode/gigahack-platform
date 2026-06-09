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
import { getScheduleForEvent, getUpcomingScheduleItems } from "@/lib/actions/schedule";
import { isAdmin } from "@/lib/permissions";
import { db } from "@db/index";
import { partnerProfiles } from "@db/schema";
import { eq } from "drizzle-orm";
import { EventSelector } from "@/components/dashboard/event-selector";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus, Pencil, Users, Building2, Lightbulb, Ticket, ClipboardList, GraduationCap, CalendarClock } from "lucide-react";

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

    const [partners, challenges, teams, registrations, ticketStats, mentors, scheduleItems] = event
      ? await Promise.all([
          getPartnersForEvent(event.id),
          getChallengesForEvent(event.id),
          getTeamsForEvent(event.id),
          getRegistrationsForEvent(event.id),
          getTicketStats(event.id),
          getMentorsForEvent(event.id),
          getScheduleForEvent(event.id),
        ])
      : [[], [], [], [], { total: 0, claimed: 0, unclaimed: 0 }, [], []];

    const approvedRegistrations = registrations.filter((r) => r.status === "approved").length;

    return (
      <main className="min-h-screen p-8" style={{ color: "var(--fg-1)" }}>
        <div className="mx-auto max-w-4xl">
          {/* Header row */}
          <div className="mb-2">
            <p className="gh-kicker">» Admin</p>
          </div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "32px", letterSpacing: "-0.02em" }}>
              Dashboard
            </h1>
            <div className="flex items-center gap-3">
              <EventSelector
                events={eventList.map((e) => ({ slug: e.slug, title: e.title, year: e.year }))}
                selectedSlug={selectedSlug}
              />
              <Button asChild size="sm">
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
              <div className="mb-4 p-6" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "24px", letterSpacing: "-0.015em" }}>{event.title}</h2>
                    <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>Edition {event.year}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <EventStatusBadge status={event.status} />
                    <Button asChild size="sm" variant="outline">
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
                  <StatCard icon={<ClipboardList className="h-4 w-4" />} label="Approved" value={approvedRegistrations} href={`/events/${event.slug}/registrations`} />
                  <StatCard icon={<Ticket className="h-4 w-4" />} label="Tickets" value={`${ticketStats.claimed}/${ticketStats.total}`} href={`/events/${event.slug}/tickets`} />
                  <StatCard icon={<Users className="h-4 w-4" />} label="Teams" value={teams.length} href={`/events/${event.slug}/teams`} />
                  <StatCard icon={<Building2 className="h-4 w-4" />} label="Partners" value={partners.length} href={`/events/${event.slug}/partners`} />
                  <StatCard icon={<Lightbulb className="h-4 w-4" />} label="Challenges" value={challenges.length} href={`/events/${event.slug}/challenges`} />
                  <StatCard icon={<GraduationCap className="h-4 w-4" />} label="Mentors" value={mentors.length} href={`/events/${event.slug}/mentors`} />
                  <StatCard icon={<CalendarClock className="h-4 w-4" />} label="Schedule" value={scheduleItems.length} href={`/admin/events/${event.id}/schedule`} />
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
                <NavTab href={`/admin/events/${event.id}/schedule`}>Schedule</NavTab>
              </div>
            </>
          ) : (
            <div className="p-12 text-center" style={{ border: "1px dashed var(--border-strong)" }}>
              <CalendarDays className="mx-auto mb-4 h-10 w-10" style={{ color: "var(--fg-faint)" }} />
              <p style={{ color: "var(--fg-3)" }}>No events yet.</p>
              <Button asChild className="mt-4">
                <Link href="/events/new">Create your first event</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── Non-admin view ────────────────────────────────────────────
  const activeEventForSchedule = eventList.find((e) =>
    ["registration_open", "applications_open", "in_progress", "judging"].includes(e.status),
  ) ?? eventList[0] ?? null;
  const upcomingItems = activeEventForSchedule
    ? await getUpcomingScheduleItems(activeEventForSchedule.id, 3)
    : [];

  return (
    <main className="min-h-screen p-8" style={{ color: "var(--fg-1)" }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="gh-kicker mb-2">» Welcome back</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "32px", letterSpacing: "-0.02em" }}>
            Hi {session?.user?.name?.split(" ")[0] ?? "there"}, let&apos;s build something that matters<span className="gh-cursor" />
          </h1>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "var(--fg-3)" }}>{session?.user?.email}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/events"
            className="group p-6 transition-colors"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <div className="mb-3 flex items-center gap-3">
              <CalendarDays className="h-5 w-5" style={{ color: "var(--green)" }} />
              <h2 style={{ fontWeight: 600, fontSize: "15px" }}>Events</h2>
            </div>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px" }}>{eventList.length}</p>
            <p style={{ fontSize: "13px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
              {eventList.length === 1 ? "edition" : "editions"} total
            </p>
          </Link>
        </div>

        {/* Upcoming schedule widget */}
        {upcomingItems.length > 0 && activeEventForSchedule && (
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="gh-kicker">» Upcoming</p>
              <Link href={`/events/${activeEventForSchedule.slug}/schedule`}
                style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--green)", letterSpacing: "0.04em" }}
              >
                View full schedule →
              </Link>
            </div>
            <div className="space-y-2">
              {upcomingItems.map((item) => (
                <div key={item.id} className="flex items-start gap-4 px-4 py-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div style={{ flexShrink: 0, textAlign: "right", minWidth: "64px" }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, color: "var(--fg-1)" }}>
                      {item.startsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--fg-faint)" }}>
                      {item.startsAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div style={{ width: "1px", alignSelf: "stretch", background: "var(--border)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: "13px" }}>{item.title}</p>
                    {item.location && (
                      <p style={{ fontSize: "11px", color: "var(--fg-3)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>📍 {item.location}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {partnerList.length > 0 && (
          <div className="mt-8">
            <p className="gh-kicker mb-4">» Your partner profiles</p>
            <div className="space-y-3">
              {partnerList.map((profile) => {
                const ev = eventList.find((e) => e.id === profile.eventId);
                if (!ev) return null;
                return (
                  <div key={profile.id} className="p-5" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "15px" }}>{profile.companyName}</p>
                        <p style={{ fontSize: "13px", color: "var(--fg-3)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>{ev.title} · {ev.year}</p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/events/${ev.slug}/partners/${profile.id}`}>
                          <Button size="sm" variant="outline">Profile</Button>
                        </Link>
                        <Link href={`/events/${ev.slug}/challenges`}>
                          <Button size="sm">Challenges</Button>
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
    <div className="p-3" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-3)" }}>{label}</p>
      <p style={{ marginTop: "4px", fontSize: "13px", fontWeight: 600, color: "var(--fg-1)" }}>{value}</p>
    </div>
  );
}

function StatCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number | string; href: string }) {
  return (
    <Link
      href={href as Route}
      className="gh-stat-card flex flex-col gap-1 p-4 transition-colors"
      style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2" style={{ fontSize: "11px", color: "var(--fg-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        <span style={{ color: "var(--fg-3)" }}>{icon}</span>
        {label}
      </div>
      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "22px", color: "var(--fg-1)" }}>{value}</p>
    </Link>
  );
}

function NavTab({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href as Route}
      className="gh-nav-tab inline-flex items-center gap-1.5 px-4 py-2 text-sm"
    >
      {children}
    </Link>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: "var(--ink-650)", color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: "11px", padding: "1px 6px" }}>
      {children}
    </span>
  );
}
