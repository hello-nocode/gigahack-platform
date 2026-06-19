import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/actions/events";
import { getChallengesForEvent } from "@/lib/actions/challenges";
import { getPartnersForEvent } from "@/lib/actions/partners";
import { getTeamsForEvent } from "@/lib/actions/teams";
import { getMentorsForEvent } from "@/lib/actions/mentors";
import { getMyRegistration, getRegistrationsForEvent } from "@/lib/actions/registrations";
import { getTicketStats } from "@/lib/actions/tickets";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { db } from "@db/index";
import { partnerProfiles, mentorProfiles } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { Button } from "@/components/ui/button";
import type { Route } from "next";
import { ArrowLeft, Pencil, ExternalLink } from "lucide-react";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);

  if (!event) notFound();

  const admin = session?.user?.id ? await isAdmin(session.user.id) : false;

  const [isPartnerForEvent, isMentorForEvent] = await Promise.all([
    session?.user?.id
      ? db.select({ id: partnerProfiles.id })
          .from(partnerProfiles)
          .where(and(eq(partnerProfiles.userId, session.user.id), eq(partnerProfiles.eventId, event.id)))
          .then(r => r.length > 0)
      : Promise.resolve(false),
    session?.user?.id
      ? db.select({ id: mentorProfiles.id })
          .from(mentorProfiles)
          .where(and(eq(mentorProfiles.userId, session.user.id), eq(mentorProfiles.eventId, event.id)))
          .then(r => r.length > 0)
      : Promise.resolve(false),
  ]);

  const [partners, challenges, teamList, myRegistration, allRegistrations, ticketStats, mentors] = await Promise.all([
    admin ? getPartnersForEvent(event.id) : Promise.resolve([]),
    admin ? getChallengesForEvent(event.id) : Promise.resolve([]),
    admin ? getTeamsForEvent(event.id) : Promise.resolve([]),
    getMyRegistration(event.id),
    admin && session?.user?.id ? getRegistrationsForEvent(event.id) : Promise.resolve([]),
    admin && session?.user?.id ? getTicketStats(event.id) : Promise.resolve({ total: 0, claimed: 0, unclaimed: 0 }),
    getMentorsForEvent(event.id),
  ]);

  return (
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "48rem" }}>
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost">
            <Link href="/events"><ArrowLeft className="mr-2 h-4 w-4" />All Events</Link>
          </Button>
          {admin && (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <a href={`/register/${slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />Public page
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/events/${slug}/edit`}><Pencil className="mr-2 h-4 w-4" />Edit</Link>
              </Button>
            </div>
          )}
        </div>

        {admin ? (
          <div className="gh-card p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em" }}>{event.title}</h1>
                <p style={{ marginTop: "6px", fontSize: "13px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>Edition {event.year}</p>
              </div>
              <EventStatusBadge status={event.status} />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoCard label="Team Size" value={`${event.minTeamSize} \u2013 ${event.maxTeamSize} members`} />
              <InfoCard label="Max Applications" value={`${event.maxChallengeApplications} per team`} />
              <InfoCard label="Partner Applications" value={event.partnerApplicationsOpen ? "Open" : "Closed"} />
              {event.startsAt && (
                <InfoCard label="Starts" value={new Date(event.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
              )}
              {event.endsAt && (
                <InfoCard label="Ends" value={new Date(event.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
              )}
              <InfoCard label="Timezone" value={event.timezone} />
            </div>
          </div>
        ) : (
          <div className="gh-card px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "24px", letterSpacing: "-0.02em" }}>{event.title}</h1>
                <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                  {event.startsAt && event.endsAt && (
                    <span>
                      {new Date(event.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {" \u2013 "}
                      {new Date(event.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                  <span style={{ color: "var(--border)" }}>·</span>
                  <span>Team: {event.minTeamSize}–{event.maxTeamSize} members</span>
                  <span style={{ color: "var(--border)" }}>·</span>
                  <span>{event.timezone}</span>
                </div>
              </div>
              <EventStatusBadge status={event.status} />
            </div>
          </div>
        )}

        {!admin && !isPartnerForEvent && !isMentorForEvent && event.registrationOpen && myRegistration?.status !== "approved" && (
          <div className="mt-4 flex items-center justify-between gap-3 px-5 py-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: "13px", color: "var(--fg-3)" }}>Verify your ticket to register for this event.</p>
            <Button asChild size="sm">
              <Link href={"/onboarding" as Route}>Verify ticket</Link>
            </Button>
          </div>
        )}
        {!admin && !isPartnerForEvent && !isMentorForEvent && !event.registrationOpen && !myRegistration && (
          <div className="mt-4 px-5 py-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: "13px", color: "var(--fg-3)" }}>Registration is currently closed for this event.</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <NavTab href={`/events/${slug}/mentors`}>Mentors{admin && <TabCount>{mentors.length}</TabCount>}</NavTab>
          <NavTab href={`/events/${slug}/partners`}>Partners{admin && <TabCount>{partners.length}</TabCount>}</NavTab>
          <NavTab href={`/events/${slug}/challenges`}>Challenges{admin && <TabCount>{challenges.length}</TabCount>}</NavTab>
          <NavTab href={`/events/${slug}/teams`}>Teams{admin && <TabCount>{teamList.length}</TabCount>}</NavTab>
          {admin && (
            <>
              <NavTab href={`/events/${slug}/registrations`}>Registrations<TabCount>{allRegistrations.filter((r) => r.status === "approved").length}</TabCount></NavTab>
              <NavTab href={`/events/${slug}/tickets`}>Tickets<TabCount>{ticketStats.claimed}/{ticketStats.total}</TabCount></NavTab>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--surface-3)", border: "1px solid var(--border)", padding: "14px 16px" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-faint)" }}>{label}</p>
      <p style={{ marginTop: "4px", fontSize: "14px", fontWeight: 600, color: "var(--fg-1)" }}>{value}</p>
    </div>
  );
}

function TabCount({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ marginLeft: "6px", padding: "1px 5px", background: "var(--ink-650)", fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--fg-3)" }}>{children}</span>
  );
}

function NavTab({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href as Route} className="gh-nav-tab inline-flex items-center gap-1.5 px-4 py-2 text-sm">
      {children}
    </Link>
  );
}
