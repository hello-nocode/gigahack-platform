import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@/lib/auth/config";
import { getEventBySlug } from "@/lib/actions/events";
import { getMentorsForEvent } from "@/lib/actions/mentors";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";

export default async function MentorsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const mentors = await getMentorsForEvent(event.id);

  return (
    <main className="gh-page">
      <div className="gh-page-inner">
        <div className="mb-6">
          <Button asChild variant="ghost">
            <Link href={`/events/${slug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Event</Link>
          </Button>
        </div>

        <p className="gh-kicker mb-1">» Mentors</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em", marginBottom: "4px" }}>Mentors</h1>
        <p style={{ marginBottom: "28px", fontSize: "13px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
          {mentors.length} mentor{mentors.length !== 1 ? "s" : ""} available for {event.title}
        </p>

        {mentors.length === 0 ? (
          <div className="p-16 text-center" style={{ border: "1px dashed var(--border-strong)" }}>
            <User className="mx-auto mb-4 h-10 w-10" style={{ color: "var(--fg-faint)" }} />
            <p style={{ color: "var(--fg-3)" }}>No mentors have joined yet.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {mentors.map((mentor) => (
              <Link
                key={mentor.id}
                href={`/events/${slug}/mentors/${mentor.id}` as Route}
                className="gh-card gh-card-hover flex items-start gap-4 p-5"
              >
                {mentor.avatarUrl ? (
                  <img src={mentor.avatarUrl} alt={`${mentor.firstName} ${mentor.lastName}`}
                    style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid var(--border)" }} />
                ) : (
                  <div style={{ width: 52, height: 52, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink-650)", fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700, color: "var(--fg-3)" }}>
                    {mentor.firstName?.[0] ?? "M"}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: "var(--fg-1)" }}>{mentor.firstName} {mentor.lastName}</p>
                  {mentor.company && <p style={{ fontSize: "13px", color: "var(--fg-3)", marginTop: "2px" }}>{mentor.company}</p>}
                  {mentor.expertise && <p style={{ marginTop: "4px", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mentor.expertise}</p>}
                  <p style={{ marginTop: "8px", fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--green)" }}>
                    {mentor.availableSlots} slot{mentor.availableSlots !== 1 ? "s" : ""} available
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
