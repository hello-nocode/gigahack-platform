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
    <main className="gh-page">
      <div className="gh-page-inner">
        <div className="mb-6">
          <Button asChild variant="ghost" className="mb-4">
            <Link href={`/events/${slug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Event</Link>
          </Button>
          <p className="gh-kicker mb-1">» Tickets</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em" }}>Ticket Management</h1>
          <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--fg-3)" }}>{event.title}</p>
        </div>

        <div className="mb-8 grid grid-cols-3 gap-3">
          <div className="gh-card p-5 text-center">
            <p style={{ fontSize: "32px", fontFamily: "var(--font-display)", fontWeight: 700 }}>{stats.total}</p>
            <p style={{ marginTop: "4px", fontSize: "10px", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-faint)" }}>Total</p>
          </div>
          <div className="p-5 text-center" style={{ background: "var(--green-veil)", border: "1px solid var(--green)" }}>
            <p style={{ fontSize: "32px", fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--green)" }}>{stats.claimed}</p>
            <p style={{ marginTop: "4px", fontSize: "10px", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-faint)" }}>Claimed</p>
          </div>
          <div className="gh-card p-5 text-center">
            <p style={{ fontSize: "32px", fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--fg-3)" }}>{stats.unclaimed}</p>
            <p style={{ marginTop: "4px", fontSize: "10px", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-faint)" }}>Unclaimed</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="gh-card p-6">
            <p className="gh-kicker mb-4">» Upload Tickets</p>
            <TicketUploadForm eventId={event.id} />
          </div>

          <div className="gh-card p-6">
            <p className="gh-kicker mb-4">» Ticket List <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>({tickets.length})</span></p>

            {tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Ticket className="mb-3 h-10 w-10" style={{ color: "var(--fg-faint)" }} />
                <p style={{ color: "var(--fg-3)" }}>No tickets uploaded yet.</p>
                <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--fg-faint)" }}>Upload a CSV to get started.</p>
              </div>
            ) : (
              <div className="space-y-1" style={{ maxHeight: 480, overflowY: "auto", paddingRight: 4 }}>
                {tickets.map((t) => {
                  const claimerName = t.userFirstName && t.userLastName ? `${t.userFirstName} ${t.userLastName}` : t.userName ?? t.userEmail;
                  return (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2" style={{
                      background: t.claimedBy ? "var(--green-veil)" : "var(--surface-2)",
                      border: `1px solid ${t.claimedBy ? "var(--green)" : "var(--border)"}`,
                    }}>
                      <div className="flex items-center gap-2 min-w-0">
                        {t.claimedBy
                          ? <CheckCircle style={{ width: 12, height: 12, flexShrink: 0, color: "var(--green)" }} />
                          : <Circle style={{ width: 12, height: 12, flexShrink: 0, color: "var(--fg-faint)" }} />}
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.ticketNumber}</span>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        {t.claimedBy ? (
                          <>
                            <p style={{ fontSize: "12px", color: "var(--green)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{claimerName}</p>
                            {t.claimedAt && <p style={{ fontSize: "11px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>{new Date(t.claimedAt).toLocaleDateString("en-GB")}</p>}
                          </>
                        ) : (
                          <p style={{ fontSize: "11px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>unclaimed</p>
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
