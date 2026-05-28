import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import { getTicketStats, getTicketList } from "@/lib/actions/tickets";
import { TicketUploadForm } from "@/components/tickets/ticket-upload-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ticket, CheckCircle, Circle } from "lucide-react";

export default async function TicketsPage({
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

  const [stats, tickets] = await Promise.all([
    getTicketStats(event.id),
    getTicketList(event.id),
  ]);

  return (
    <main className="bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Button asChild variant="ghost" className="mb-4 text-slate-400 hover:text-white">
            <Link href={`/events/${slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Ticket Management</h1>
          <p className="mt-1 text-slate-400">{event.title}</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 text-center">
            <p className="text-3xl font-bold text-white">{stats.total}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Total</p>
          </div>
          <div className="rounded-xl border border-green-700/40 bg-green-900/10 p-5 text-center">
            <p className="text-3xl font-bold text-green-300">{stats.claimed}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Claimed</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-5 text-center">
            <p className="text-3xl font-bold text-slate-300">{stats.unclaimed}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Unclaimed</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Upload form */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
            <h2 className="mb-4 text-lg font-semibold">Upload Tickets</h2>
            <TicketUploadForm eventId={event.id} />
          </div>

          {/* Ticket list */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Ticket List
              <span className="ml-2 text-sm font-normal text-slate-400">({tickets.length})</span>
            </h2>

            {tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Ticket className="mb-3 h-10 w-10 text-slate-600" />
                <p className="text-slate-400">No tickets uploaded yet.</p>
                <p className="mt-1 text-sm text-slate-500">Upload a CSV to get started.</p>
              </div>
            ) : (
              <div className="max-h-[480px] overflow-y-auto space-y-1 pr-1">
                {tickets.map((t) => {
                  const claimerName = t.userFirstName && t.userLastName
                    ? `${t.userFirstName} ${t.userLastName}`
                    : t.userName ?? t.userEmail;
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                        t.claimedBy
                          ? "bg-green-900/10 border border-green-800/30"
                          : "bg-slate-800/40 border border-slate-700/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {t.claimedBy ? (
                          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-400" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        )}
                        <span className="font-mono text-xs text-slate-200 truncate">{t.ticketNumber}</span>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        {t.claimedBy ? (
                          <>
                            <p className="text-xs text-green-300 truncate max-w-[140px]">{claimerName}</p>
                            {t.claimedAt && (
                              <p className="text-xs text-slate-500">
                                {new Date(t.claimedAt).toLocaleDateString("en-GB")}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-slate-500">unclaimed</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
