import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug, getValidTransitions, getStatusLabel, updateEventStatus } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

const statusStyles: Record<string, { background: string; color: string }> = {
  draft: { background: "var(--surface-3)", color: "var(--fg-faint)" },
  registration_open: { background: "rgba(0,170,255,0.1)", color: "#4FC3F7" },
  applications_open: { background: "var(--green-veil)", color: "var(--green)" },
  in_progress: { background: "rgba(232,229,83,0.1)", color: "var(--warn)" },
  judging: { background: "rgba(179,136,255,0.1)", color: "#CE93D8" },
  completed: { background: "var(--green-veil)", color: "var(--green)" },
};

export default async function EventStatusPage({ params }: PageProps) {
  const { eventId } = await params;
  const [event, session] = await Promise.all([
    getEventBySlug(eventId),
    auth(),
  ]);

  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const admin = await isAdmin(session.user.id);
  if (!admin) redirect("/dashboard");

  const validTransitions = await getValidTransitions(event.status);
  const statusLabel = await getStatusLabel(event.status);

  return (
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "48rem" }}>
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href={`/events/${event.slug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Event</Link>
          </Button>
          <p className="gh-kicker mb-1">» Admin</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em" }}>Event Status</h1>
          <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--fg-3)" }}>{event.title}</p>
        </div>

        <div className="mb-6 gh-card p-6">
          <p className="gh-kicker mb-3">» Current Status</p>
          <span style={{ display: "inline-block", padding: "4px 12px", fontSize: "13px", fontFamily: "var(--font-mono)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", ...(statusStyles[event.status] ?? { background: "var(--surface-3)", color: "var(--fg-faint)" }) }}>
            {statusLabel}
          </span>
        </div>

        <div className="mb-6 gh-card p-6">
          <p className="gh-kicker mb-4">» Available Transitions</p>
          {validTransitions.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--fg-faint)" }}>No transitions available from this state.</p>
          ) : (
            <div className="space-y-2">
              {validTransitions.map((transition) => (
                <form key={transition} action={async () => { "use server"; await updateEventStatus(event.id, transition); }}>
                  <Button type="submit" variant="outline" className="w-full justify-between">
                    <span>Transition to {getStatusLabel(transition)}</span>
                    <span style={{ marginLeft: "8px", padding: "1px 6px", fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", ...(statusStyles[transition] ?? { background: "var(--surface-3)", color: "var(--fg-faint)" }) }}>
                      {getStatusLabel(transition)}
                    </span>
                  </Button>
                </form>
              ))}
            </div>
          )}
        </div>

        <div className="gh-card p-6">
          <p className="gh-kicker mb-4">» Status Flow</p>
          <div className="flex flex-wrap items-center gap-2">
            {(["draft", "registration_open", "applications_open", "in_progress", "judging", "completed"] as const).map((s, i, arr) => (
              <>
                <span key={s} style={{ padding: "2px 8px", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", opacity: event.status === s ? 1 : 0.35, ...(statusStyles[s] ?? {}) }}>
                  {getStatusLabel(s)}
                </span>
                {i < arr.length - 1 && <span key={`arrow-${s}`} style={{ color: "var(--fg-faint)" }}>→</span>}
              </>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-3 p-4" style={{ border: "1px solid var(--warn)", background: "rgba(232,229,83,0.06)" }}>
            <AlertCircle style={{ marginTop: "2px", width: 16, height: 16, flexShrink: 0, color: "var(--warn)" }} />
            <div style={{ fontSize: "13px" }}>
              <p style={{ fontWeight: 600, color: "var(--warn)" }}>Important</p>
              <p style={{ marginTop: "4px", color: "var(--fg-3)" }}>Status transitions trigger automated actions. Moving forward closes previous stages (e.g., closing registration freezes teams).</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
