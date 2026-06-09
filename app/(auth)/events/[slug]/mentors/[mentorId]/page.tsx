import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { db } from "@db/index";
import { partnerProfiles, mentorProfiles as mentorProfilesTable } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { getEventBySlug } from "@/lib/actions/events";
import {
  getMentorProfile,
  getSlotsByMentor,
} from "@/lib/actions/mentors";
import { getUserTeamInEvent } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { SlotGrid } from "@/components/mentors/slot-grid";
import { ArrowLeft, Pencil, ExternalLink, Calendar } from "lucide-react";

export default async function MentorDetailPage({
  params,
}: {
  params: Promise<{ slug: string; mentorId: string }>;
}) {
  const { slug, mentorId } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const [mentor, admin] = await Promise.all([
    getMentorProfile(mentorId),
    isAdmin(session.user.id),
  ]);
  if (!mentor || mentor.eventId !== event.id) notFound();

  const isOwnProfile = mentor.userId === session.user.id;

  // Check if current user is a partner or mentor for this event
  const [isPartner, isMentor] = await Promise.all([
    db.select({ id: partnerProfiles.id })
      .from(partnerProfiles)
      .where(and(eq(partnerProfiles.userId, session.user.id), eq(partnerProfiles.eventId, event.id)))
      .then(r => r.length > 0),
    db.select({ id: mentorProfilesTable.id })
      .from(mentorProfilesTable)
      .where(and(eq(mentorProfilesTable.userId, session.user.id), eq(mentorProfilesTable.eventId, event.id)))
      .then(r => r.length > 0),
  ]);

  // Only plain participants (approved + team leader) may book
  const canBook = !admin && !isPartner && !isMentor;
  const userTeam = canBook ? await getUserTeamInEvent(event.id) : null;

  const slots = await getSlotsByMentor(mentorId);

  return (
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "48rem" }}>
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost">
            <Link href={`/events/${slug}/mentors`}><ArrowLeft className="mr-2 h-4 w-4" />All Mentors</Link>
          </Button>
          <div className="flex items-center gap-2">
            {(isOwnProfile || admin) && (
              <>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/events/${slug}/mentors/${mentorId}/edit` as Route}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit Profile</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={`/events/${slug}/mentors/${mentorId}/schedule` as Route}><Calendar className="mr-1.5 h-3.5 w-3.5" />Manage Schedule</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mb-6 gh-card p-6">
          <div className="flex items-start gap-5">
            {mentor.avatarUrl ? (
              <img src={mentor.avatarUrl} alt={`${mentor.firstName} ${mentor.lastName}`}
                style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 72, height: 72, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink-650)", fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 700, color: "var(--fg-3)" }}>
                {mentor.firstName?.[0] ?? "M"}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "22px", letterSpacing: "-0.02em" }}>{mentor.firstName} {mentor.lastName}</h1>
              {mentor.company && <p style={{ marginTop: "4px", fontSize: "14px", color: "var(--fg-3)" }}>{mentor.company}</p>}
              {mentor.linkedinUrl && (
                <a href={mentor.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  style={{ marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--green)", fontFamily: "var(--font-mono)" }}
                  className="hover:underline">
                  <ExternalLink style={{ width: 11, height: 11 }} />LinkedIn
                </a>
              )}
            </div>
          </div>

          {mentor.expertise && (
            <div className="mt-5">
              <p className="gh-kicker mb-2">» Expertise</p>
              <div className="flex flex-wrap gap-2">
                {mentor.expertise.split(",").map((tag) => (
                  <span key={tag} style={{ padding: "2px 8px", fontSize: "11px", fontFamily: "var(--font-mono)", border: "1px solid var(--border)", color: "var(--fg-2)", background: "var(--surface-3)" }}>{tag.trim()}</span>
                ))}
              </div>
            </div>
          )}

          {mentor.bio && (
            <div className="mt-5">
              <p className="gh-kicker mb-2">» About</p>
              <p style={{ fontSize: "14px", color: "var(--fg-2)", lineHeight: 1.6 }}>{mentor.bio}</p>
            </div>
          )}
        </div>

        <p className="gh-kicker mb-4">» Available Sessions</p>
        <SlotGrid slots={slots} teamId={canBook ? userTeam?.id : undefined} myTeamId={userTeam?.id} />
      </div>
    </main>
  );
}
