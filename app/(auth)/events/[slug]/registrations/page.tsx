import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import { getRegistrationsForEvent, toggleRegistrationOpen } from "@/lib/actions/registrations";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, ToggleLeft, ToggleRight, Ticket } from "lucide-react";

export default async function RegistrationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const admin = await isAdmin(session.user.id);
  if (!admin) redirect("/dashboard");

  const registrations = await getRegistrationsForEvent(event.id);

  const grouped = {
    pending: registrations.filter((r) => r.status === "pending"),
    approved: registrations.filter((r) => r.status === "approved"),
    rejected: registrations.filter((r) => r.status === "rejected"),
    withdrawn: registrations.filter((r) => r.status === "withdrawn"),
  };

  return (
    <main className="bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" className="text-slate-400 hover:text-white">
            <Link href={`/events/${slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Link>
          </Button>

          {/* Toggle registration open/closed */}
          <form action={async () => {
            "use server";
            await toggleRegistrationOpen(event.id, !event.registrationOpen);
          }}>
            <button
              type="submit"
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                event.registrationOpen
                  ? "border-green-700/50 bg-green-900/20 text-green-300 hover:bg-green-900/40"
                  : "border-slate-600 bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {event.registrationOpen ? (
                <><ToggleRight className="h-4 w-4" /> Registration Open</>
              ) : (
                <><ToggleLeft className="h-4 w-4" /> Registration Closed</>
              )}
            </button>
          </form>
        </div>

        <h1 className="mb-1 text-3xl font-bold">Registrations</h1>
        <p className="mb-8 text-slate-400">{event.title} · {registrations.length} total</p>

        {/* Stats row */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["pending", "approved", "rejected", "withdrawn"] as const).map((s) => (
            <div key={s} className={`rounded-xl border p-4 text-center ${
              s === "pending" ? "border-yellow-700/40 bg-yellow-900/10" :
              s === "approved" ? "border-green-700/40 bg-green-900/10" :
              s === "rejected" ? "border-red-700/40 bg-red-900/10" :
              "border-slate-700 bg-slate-800/40"
            }`}>
              <p className={`text-2xl font-bold ${
                s === "pending" ? "text-yellow-300" :
                s === "approved" ? "text-green-300" :
                s === "rejected" ? "text-red-300" :
                "text-slate-400"
              }`}>{grouped[s].length}</p>
              <p className="text-xs capitalize text-slate-400 mt-0.5">{s}</p>
            </div>
          ))}
        </div>

        {registrations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-16 text-center">
            <Users className="mx-auto mb-4 h-10 w-10 text-slate-600" />
            <p className="text-slate-400">No registrations yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {(["pending", "approved", "rejected", "withdrawn"] as const).map((status) => {
              const group = grouped[status];
              if (group.length === 0) return null;
              return (
                <section key={status}>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 capitalize">
                    {status} ({group.length})
                  </h2>
                  <div className="space-y-2">
                    {group.map((reg) => {
                      const displayName = reg.firstName && reg.lastName
                        ? `${reg.firstName} ${reg.lastName}`
                        : reg.name ?? reg.email;
                      const avatar = reg.avatarUrl ?? reg.image;
                      return (
                        <div key={reg.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              {avatar ? (
                                <img src={avatar} alt={displayName} className="h-9 w-9 rounded-full object-cover" />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-bold">
                                  {displayName[0]?.toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{displayName}</p>
                                <p className="text-xs text-slate-500">{reg.email}</p>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <p className="text-xs text-slate-600">
                                    {new Date(reg.createdAt).toLocaleDateString("en-GB")}
                                  </p>
                                  {reg.ticketNumber && (
                                    <span className="inline-flex items-center gap-1 rounded bg-blue-900/30 px-1.5 py-0.5 text-xs font-mono text-blue-300 border border-blue-800/40">
                                      <Ticket className="h-3 w-3" />{reg.ticketNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {status === "approved" && reg.ticketNumber && (
                              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-green-900/30 border border-green-700/40 px-2.5 py-0.5 text-xs text-green-300">
                                <Ticket className="h-3 w-3" /> Ticket verified
                              </span>
                            )}
                          </div>
                          {(reg.motivation || reg.skills || reg.experience) && (
                            <div className="mt-3 space-y-1.5 border-t border-slate-700 pt-3">
                              {reg.motivation && (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Motivation</p>
                                  <p className="text-sm text-slate-300">{reg.motivation}</p>
                                </div>
                              )}
                              {reg.skills && (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Skills</p>
                                  <p className="text-sm text-slate-300">{reg.skills}</p>
                                </div>
                              )}
                              {reg.experience && (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Experience</p>
                                  <p className="text-sm text-slate-300">{reg.experience}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
