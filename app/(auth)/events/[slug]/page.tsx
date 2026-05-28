import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/actions/events";
import { getChallengesForEvent } from "@/lib/actions/challenges";
import { getPartnersForEvent } from "@/lib/actions/partners";
import { getTeamsForEvent } from "@/lib/actions/teams";
import { getMyRegistration, getRegistrationsForEvent } from "@/lib/actions/registrations";
import { getTicketStats } from "@/lib/actions/tickets";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { db } from "@db/index";
import { partnerProfiles } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { RegisterButton } from "@/components/events/register-button";
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

  const isPartnerForEvent = session?.user?.id
    ? await db.select({ id: partnerProfiles.id })
        .from(partnerProfiles)
        .where(and(
          eq(partnerProfiles.userId, session.user.id),
          eq(partnerProfiles.eventId, event.id)
        ))
        .then(r => r.length > 0)
    : false;

  const [_partners, _challenges, _teamList, myRegistration, allRegistrations, ticketStats] = await Promise.all([
    admin ? getPartnersForEvent(event.id) : Promise.resolve([]),
    admin ? getChallengesForEvent(event.id) : Promise.resolve([]),
    admin ? getTeamsForEvent(event.id) : Promise.resolve([]),
    getMyRegistration(event.id),
    admin && session?.user?.id ? getRegistrationsForEvent(event.id) : Promise.resolve([]),
    admin && session?.user?.id ? getTicketStats(event.id) : Promise.resolve({ total: 0, claimed: 0, unclaimed: 0 }),
  ]);

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" className="text-slate-400 hover:text-white">
            <Link href="/events">
              <ArrowLeft className="mr-2 h-4 w-4" />
              All Events
            </Link>
          </Button>
          {admin && (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="text-slate-400 hover:text-slate-200" size="sm">
                <a href={`/register/${slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Public page
                </a>
              </Button>
              <Button asChild variant="outline" className="border-slate-500 bg-slate-800 text-white hover:bg-slate-700 hover:text-white">
                <Link href={`/events/${slug}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            </div>
          )}
        </div>

        {admin ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">{event.title}</h1>
                <p className="mt-2 text-slate-400">Edition {event.year}</p>
              </div>
              <EventStatusBadge status={event.status} />
            </div>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
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
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{event.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                  {event.startsAt && event.endsAt && (
                    <span>
                      {new Date(event.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {" \u2013 "}
                      {new Date(event.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                  <span className="text-slate-600">·</span>
                  <span>Team: {event.minTeamSize}–{event.maxTeamSize} members</span>
                  <span className="text-slate-600">·</span>
                  <span>{event.timezone}</span>
                </div>
              </div>
              <EventStatusBadge status={event.status} />
            </div>
          </div>
        )}

        {/* Registration status banner — participants only (not partners) */}
        {!admin && !isPartnerForEvent && event.registrationOpen && (
          <div className="mt-4">
            <RegisterButton
              eventId={event.id}
              eventSlug={slug}
              registration={myRegistration}
            />
          </div>
        )}
        {!admin && !isPartnerForEvent && !event.registrationOpen && !myRegistration && (
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/30 px-5 py-3">
            <p className="text-sm text-slate-400">Registration is currently closed for this event.</p>
          </div>
        )}

        {/* Secondary nav */}
        <div className="mt-4 flex flex-wrap gap-2">
          <NavTab href={`/events/${slug}/partners`}>Partners</NavTab>
          <NavTab href={`/events/${slug}/challenges`}>Challenges</NavTab>
          <NavTab href={`/events/${slug}/teams`}>Teams</NavTab>
          {admin && (
            <>
              <NavTab href={`/events/${slug}/registrations`}>
                Registrations
                <span className="ml-1.5 rounded-full bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">
                  {allRegistrations.filter((r) => r.status === "approved").length}
                </span>
              </NavTab>
              <NavTab href={`/events/${slug}/tickets`}>
                Tickets
                <span className="ml-1.5 rounded-full bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">
                  {ticketStats.claimed}/{ticketStats.total}
                </span>
              </NavTab>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function NavTab({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href as Route}
      className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white"
    >
      {children}
    </Link>
  );
}
