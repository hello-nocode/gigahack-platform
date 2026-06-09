import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventById } from "@/lib/actions/events";
import { getScheduleForEvent, deleteScheduleItem } from "@/lib/actions/schedule";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarClock, Trash2 } from "lucide-react";
import { ScheduleItemForm } from "@/components/schedule/schedule-item-form";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

const TYPE_LABELS: Record<string, string> = {
  keynote: "Keynote",
  workshop: "Workshop",
  meal: "Meal",
  deadline: "Deadline",
  other: "Other",
};

const TYPE_COLORS: Record<string, { background: string; color: string }> = {
  keynote: { background: "rgba(0,233,5,0.1)", color: "var(--green)" },
  workshop: { background: "rgba(0,170,255,0.1)", color: "#4FC3F7" },
  meal: { background: "rgba(179,136,255,0.1)", color: "#CE93D8" },
  deadline: { background: "rgba(220,50,50,0.12)", color: "var(--danger)" },
  other: { background: "var(--surface-3)", color: "var(--fg-3)" },
};

export default async function AdminSchedulePage({ params }: PageProps) {
  const { eventId } = await params;
  const [session, event] = await Promise.all([auth(), getEventById(eventId)]);

  if (!session?.user?.id) redirect("/login");
  if (!event) notFound();

  const admin = await isAdmin(session.user.id);
  if (!admin) redirect("/dashboard");

  const items = await getScheduleForEvent(event.id);

  return (
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "52rem" }}>
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href={`/events/${event.slug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Event</Link>
          </Button>
          <p className="gh-kicker mb-1">» Admin · {event.title}</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em" }}>
            Event Schedule
          </h1>
          <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--fg-3)" }}>
            {items.length} item{items.length !== 1 ? "s" : ""} · visible to all participants
          </p>
        </div>

        {/* Add item form */}
        <div className="mb-8 gh-card p-6">
          <p className="gh-kicker mb-4">» Add Schedule Item</p>
          <ScheduleItemForm eventId={event.id} />
        </div>

        {/* Item list */}
        {items.length === 0 ? (
          <div className="p-16 text-center" style={{ border: "1px dashed var(--border-strong)" }}>
            <CalendarClock className="mx-auto mb-4 h-10 w-10" style={{ color: "var(--fg-faint)" }} />
            <p style={{ color: "var(--fg-3)", fontSize: "14px" }}>No schedule items yet. Add the first one above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="gh-card flex items-start gap-4 px-5 py-4">
                <div style={{ flexShrink: 0, textAlign: "right", minWidth: "80px" }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600, color: "var(--fg-1)" }}>
                    {item.startsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--fg-faint)" }}>
                    {item.startsAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div style={{ width: "1px", alignSelf: "stretch", background: "var(--border)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p style={{ fontWeight: 600, fontSize: "14px" }}>{item.title}</p>
                    <span style={{ padding: "1px 6px", fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0, ...(TYPE_COLORS[item.type] ?? TYPE_COLORS.other) }}>
                      {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                  </div>
                  {item.location && (
                    <p style={{ marginTop: "2px", fontSize: "12px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                      📍 {item.location}
                    </p>
                  )}
                  {item.endsAt && (
                    <p style={{ marginTop: "2px", fontSize: "11px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
                      until {item.endsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  {item.description && (
                    <p style={{ marginTop: "6px", fontSize: "13px", color: "var(--fg-2)", lineHeight: 1.5 }}>{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <ScheduleItemForm eventId={event.id} item={item} editMode />
                  <form
                    action={async () => {
                      "use server";
                      await deleteScheduleItem(item.id);
                    }}
                  >
                    <button
                      type="submit"
                      title="Delete item"
                      className="gh-btn-ghost flex h-8 w-8 items-center justify-center transition-colors"
                      style={{ color: "var(--danger)" }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
