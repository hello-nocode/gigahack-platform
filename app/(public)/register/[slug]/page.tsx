import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getEventBySlug } from "@/lib/actions/events";
import { getChallengesForEvent } from "@/lib/actions/challenges";
import { getTeamsForEvent } from "@/lib/actions/teams";
import { getRegistrationsForEvent } from "@/lib/actions/registrations";
import { CalendarDays, MapPin, Users, Lightbulb, ArrowRight, ExternalLink } from "lucide-react";

export default async function EventLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();

  const [challenges, teams, registrations] = await Promise.all([
    getChallengesForEvent(event.id),
    getTeamsForEvent(event.id),
    getRegistrationsForEvent(event.id),
  ]);

  const approvedCount = registrations.filter((r) => r.status === "approved").length;
  const isLoggedIn = !!session?.user;

  const fmt = (d: Date | null | undefined) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  const sections = (event.customSections ?? []) as { title: string; body: string }[];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* ── Hero ── */}
      <div className="relative">
        {event.coverImageUrl ? (
          <div className="relative h-72 sm:h-96 overflow-hidden">
            <img
              src={event.coverImageUrl}
              alt={event.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/50 to-slate-950" />
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-br from-blue-900/50 via-slate-900 to-violet-900/50" />
        )}

        <div className="mx-auto max-w-3xl px-6 pb-12 pt-8">
          {/* Status badge */}
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold mb-4 ${
            event.status === "registration_open"
              ? "bg-green-900/40 text-green-300 border border-green-700/40"
              : event.status === "completed"
              ? "bg-slate-700/50 text-slate-400 border border-slate-600/40"
              : "bg-blue-900/40 text-blue-300 border border-blue-700/40"
          }`}>
            {event.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{event.title}</h1>
          <p className="mt-2 text-lg text-slate-400">Edition {event.year}</p>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
            {(event.startsAt || event.endsAt) && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                {fmt(event.startsAt) ?? "TBA"}
                {event.endsAt && ` – ${fmt(event.endsAt)}`}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-500" />
                {event.location}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="mt-6 flex flex-wrap gap-3">
            <StatPill icon={<Users className="h-3.5 w-3.5" />} label={`${approvedCount} registered`} />
            <StatPill icon={<Users className="h-3.5 w-3.5" />} label={`${teams.length} teams`} />
            <StatPill icon={<Lightbulb className="h-3.5 w-3.5" />} label={`${challenges.length} challenges`} />
          </div>

          {/* CTA */}
          <div className="mt-8">
            {event.registrationOpen ? (
              <Link
                href={isLoggedIn ? "/onboarding" : "/signup"}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                Register Now <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-7 py-3.5 text-base font-semibold text-slate-400">
                Registration Closed
              </div>
            )}
            {isLoggedIn && (
              <Link
                href={`/events/${slug}`}
                className="ml-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                Open portal <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Description ── */}
      {event.description && (
        <section className="mx-auto max-w-3xl px-6 pb-12">
          <h2 className="mb-3 text-xl font-bold">About</h2>
          <p className="whitespace-pre-wrap text-slate-300 leading-relaxed">{event.description}</p>
        </section>
      )}

      {/* ── Custom sections ── */}
      {sections.length > 0 && (
        <div className="mx-auto max-w-3xl px-6 pb-16 space-y-10">
          {sections.map((sec, i) => (
            <section key={i}>
              <h2 className="mb-3 text-xl font-bold">{sec.title}</h2>
              <p className="whitespace-pre-wrap text-slate-300 leading-relaxed">{sec.body}</p>
            </section>
          ))}
        </div>
      )}

      {/* ── Challenges preview ── */}
      {challenges.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 pb-16">
          <h2 className="mb-4 text-xl font-bold">Challenges</h2>
          <div className="space-y-3">
            {challenges.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="font-semibold text-slate-100">{c.title}</p>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">{c.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Bottom CTA ── */}
      {event.registrationOpen && (
        <div className="border-t border-slate-800 bg-slate-900/60 py-12 text-center">
          <h2 className="mb-2 text-2xl font-bold">Ready to join?</h2>
          <p className="mb-6 text-slate-400">Claim your spot before it fills up.</p>
          <Link
            href={isLoggedIn ? "/onboarding" : "/signup"}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Register Now <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      )}
    </main>
  );
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs text-slate-400">
      {icon} {label}
    </span>
  );
}
