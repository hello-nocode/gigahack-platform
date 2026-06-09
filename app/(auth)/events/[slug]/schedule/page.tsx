import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getEventBySlug } from "@/lib/actions/events";
import { getScheduleForEvent } from "@/lib/actions/schedule";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarClock } from "lucide-react";
import type { EventScheduleItem } from "@db/schema";

interface PageProps {
  params: Promise<{ slug: string }>;
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

function groupByDay(items: EventScheduleItem[]): Map<string, EventScheduleItem[]> {
  const map = new Map<string, EventScheduleItem[]>();
  for (const item of items) {
    const key = item.startsAt.toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
  }
  return map;
}

export default async function EventSchedulePage({ params }: PageProps) {
  const { slug } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);

  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const items = await getScheduleForEvent(event.id);
  const grouped = groupByDay(items);

  return (
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "48rem" }}>
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href={`/events/${slug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Event</Link>
          </Button>
          <p className="gh-kicker mb-1">» {event.title}</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em" }}>
            Schedule
          </h1>
          <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--fg-3)" }}>
            {items.length} item{items.length !== 1 ? "s" : ""}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="p-16 text-center" style={{ border: "1px dashed var(--border-strong)" }}>
            <CalendarClock className="mx-auto mb-4 h-10 w-10" style={{ color: "var(--fg-faint)" }} />
            <p style={{ color: "var(--fg-3)", fontSize: "14px" }}>No schedule published yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(grouped.entries()).map(([day, dayItems]) => (
              <div key={day}>
                <div className="mb-3 flex items-center gap-3">
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--green)" }}>
                    {day}
                  </p>
                  <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                </div>
                <div className="space-y-2">
                  {dayItems.map((item) => (
                    <div key={item.id} className="gh-card flex items-start gap-4 px-5 py-4">
                      <div style={{ flexShrink: 0, textAlign: "right", minWidth: "72px" }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 700, color: "var(--fg-1)" }}>
                          {item.startsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {item.endsAt && (
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--fg-faint)" }}>
                            –{item.endsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>

                      <div style={{ width: "1px", alignSelf: "stretch", background: "var(--border)", flexShrink: 0 }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p style={{ fontWeight: 600, fontSize: "15px", color: "var(--fg-1)" }}>{item.title}</p>
                          <span style={{
                            padding: "1px 7px", fontSize: "10px",
                            fontFamily: "var(--font-mono)", fontWeight: 500,
                            textTransform: "uppercase", letterSpacing: "0.06em",
                            flexShrink: 0,
                            ...(TYPE_COLORS[item.type] ?? TYPE_COLORS.other),
                          }}>
                            {TYPE_LABELS[item.type] ?? item.type}
                          </span>
                        </div>

                        {item.location && (
                          <p style={{ marginTop: "3px", fontSize: "12px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                            📍 {item.location}
                          </p>
                        )}

                        {item.description && (
                          <p style={{ marginTop: "6px", fontSize: "13px", color: "var(--fg-2)", lineHeight: 1.6 }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
