import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEvents } from "@/lib/actions/events";
import { getScheduledBroadcasts } from "@/lib/actions/notifications";
import { AdminBroadcastForm } from "@/components/notifications/admin-broadcast-form";
import { Clock, CheckCircle } from "lucide-react";

export default async function AdminNotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const admin = await isAdmin(session.user.id);
  if (!admin) redirect("/dashboard");

  const [events, broadcasts] = await Promise.all([
    getEvents(),
    getScheduledBroadcasts(),
  ]);

  return (
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "48rem" }}>
        <p className="gh-kicker mb-1">» Admin</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em", marginBottom: "4px" }}>Broadcast Notifications</h1>
        <p style={{ marginBottom: "28px", fontSize: "13px", color: "var(--fg-3)" }}>Send in-app and email notifications to filtered groups of users.</p>

        <AdminBroadcastForm events={events} />

        <div className="gh-divider my-8" />
        <p className="gh-kicker mb-4">» Broadcast History</p>
        {broadcasts.length === 0 ? (
          <div className="p-10 text-center" style={{ border: "1px dashed var(--border-strong)" }}>
            <p style={{ fontSize: "13px", color: "var(--fg-faint)" }}>No broadcasts yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b) => (
              <div key={b.id} className="gh-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600 }}>{b.title}</p>
                    <p style={{ marginTop: "2px", fontSize: "13px", color: "var(--fg-3)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{b.body}</p>
                    {b.link && <p style={{ marginTop: "2px", fontSize: "12px", color: "var(--info)", fontFamily: "var(--font-mono)" }}>{b.link}</p>}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    {b.sentAt ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--green)", background: "var(--green-veil)", border: "1px solid var(--green)" }}>
                        <CheckCircle style={{ width: 10, height: 10 }} /> Sent
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--warn)", background: "rgba(232,229,83,0.08)", border: "1px solid var(--warn)" }}>
                        <Clock style={{ width: 10, height: 10 }} /> Scheduled
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: "8px", display: "flex", gap: "16px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--fg-faint)" }}>
                  <span>{b.sentAt ? `Sent ${new Date(b.sentAt).toLocaleString("en-GB")}` : `Scheduled for ${new Date(b.sendAt).toLocaleString("en-GB")}`}</span>
                  {b.recipientCount != null && <span>{b.recipientCount} recipients</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
