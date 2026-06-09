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
    <main className="gh-page">
      <div className="gh-page-inner">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost">
            <Link href={`/events/${slug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Event</Link>
          </Button>
          <form action={async () => {
            "use server";
            await toggleRegistrationOpen(event.id, !event.registrationOpen);
          }}>
            <button type="submit" style={{
              display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px",
              fontSize: "13px", fontFamily: "var(--font-mono)", fontWeight: 500, cursor: "pointer",
              border: event.registrationOpen ? "1px solid var(--green)" : "1px solid var(--border)",
              background: event.registrationOpen ? "var(--green-veil)" : "var(--surface-2)",
              color: event.registrationOpen ? "var(--green)" : "var(--fg-3)",
            }}>
              {event.registrationOpen ? <><ToggleRight className="h-4 w-4" /> Registration Open</> : <><ToggleLeft className="h-4 w-4" /> Registration Closed</>}
            </button>
          </form>
        </div>

        <p className="gh-kicker mb-1">» Registrations</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em", marginBottom: "4px" }}>Registrations</h1>
        <p style={{ marginBottom: "28px", fontSize: "13px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{event.title} · {registrations.length} total</p>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["pending", "approved", "rejected", "withdrawn"] as const).map((s) => (
            <div key={s} className="p-4 text-center" style={{
              background: s === "pending" ? "rgba(232,229,83,0.06)" : s === "approved" ? "var(--green-veil)" : s === "rejected" ? "rgba(255,71,87,0.06)" : "var(--surface-2)",
              border: `1px solid ${s === "pending" ? "var(--warn)" : s === "approved" ? "var(--green)" : s === "rejected" ? "var(--danger)" : "var(--border)"}`,
            }}>
              <p style={{ fontSize: "28px", fontFamily: "var(--font-display)", fontWeight: 700, color: s === "pending" ? "var(--warn)" : s === "approved" ? "var(--green)" : s === "rejected" ? "var(--danger)" : "var(--fg-3)" }}>{grouped[s].length}</p>
              <p style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-faint)", marginTop: "2px" }}>{s}</p>
            </div>
          ))}
        </div>

        {registrations.length === 0 ? (
          <div className="p-16 text-center" style={{ border: "1px dashed var(--border-strong)" }}>
            <Users className="mx-auto mb-4 h-10 w-10" style={{ color: "var(--fg-faint)" }} />
            <p style={{ color: "var(--fg-3)" }}>No registrations yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {(["pending", "approved", "rejected", "withdrawn"] as const).map((status) => {
              const group = grouped[status];
              if (group.length === 0) return null;
              return (
                <section key={status}>
                  <p className="gh-kicker mb-3">» {status} ({group.length})</p>
                  <div className="space-y-2">
                    {group.map((reg) => {
                      const displayName = reg.firstName && reg.lastName ? `${reg.firstName} ${reg.lastName}` : reg.name ?? reg.email;
                      const avatar = reg.avatarUrl ?? reg.image;
                      return (
                        <div key={reg.id} className="gh-card p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              {avatar ? (
                                <img src={avatar} alt={displayName} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: 36, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink-650)", fontWeight: 700, fontSize: "14px" }}>
                                  {displayName[0]?.toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p style={{ fontWeight: 500 }}>{displayName}</p>
                                <p style={{ fontSize: "12px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{reg.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p style={{ fontSize: "11px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>{new Date(reg.createdAt).toLocaleDateString("en-GB")}</p>
                                  {reg.ticketNumber && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "1px 6px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--info)", background: "rgba(61,165,255,0.08)", border: "1px solid rgba(61,165,255,0.2)" }}>
                                      <Ticket style={{ width: 10, height: 10 }} />{reg.ticketNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {status === "approved" && reg.ticketNumber && (
                              <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--green)", background: "var(--green-veil)", border: "1px solid var(--green)" }}>
                                <Ticket style={{ width: 10, height: 10 }} /> Ticket verified
                              </span>
                            )}
                          </div>
                          {(reg.motivation || reg.skills || reg.experience) && (
                            <div className="mt-3 space-y-2" style={{ borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
                              {reg.motivation && (
                                <div>
                                  <p style={{ fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-faint)" }}>Motivation</p>
                                  <p style={{ fontSize: "13px", color: "var(--fg-2)", marginTop: "2px" }}>{reg.motivation}</p>
                                </div>
                              )}
                              {reg.skills && (
                                <div>
                                  <p style={{ fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-faint)" }}>Skills</p>
                                  <p style={{ fontSize: "13px", color: "var(--fg-2)", marginTop: "2px" }}>{reg.skills}</p>
                                </div>
                              )}
                              {reg.experience && (
                                <div>
                                  <p style={{ fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-faint)" }}>Experience</p>
                                  <p style={{ fontSize: "13px", color: "var(--fg-2)", marginTop: "2px" }}>{reg.experience}</p>
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
