import Link from "next/link";
import type { Route } from "next";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { db } from "@db/index";
import {
  users, partnerProfiles, mentorProfiles, events,
  teamMembers, teams, eventRegistrations,
} from "@db/schema";
import { and, desc, eq, notInArray } from "drizzle-orm";
import {
  LayoutDashboard, CalendarDays, Users, Lightbulb,
  GraduationCap, Building2, Bell, Rocket, CalendarClock,
} from "lucide-react";

export async function Sidebar() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;

  const [admin, dbUser, partnerCount, myTeam, activeEvent, activeMentorProfile] = await Promise.all([
    isAdmin(userId),
    db.select({
      firstName: users.firstName, lastName: users.lastName,
      name: users.name, email: users.email,
      image: users.image, avatarUrl: users.avatarUrl,
    }).from(users).where(eq(users.id, userId)).then(r => r[0] ?? null),
    db.select({ id: partnerProfiles.id }).from(partnerProfiles)
      .where(eq(partnerProfiles.userId, userId)).then(r => r.length),
    db.select({ teamId: teamMembers.teamId, eventSlug: events.slug })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .innerJoin(events, eq(events.id, teams.eventId))
      .where(eq(teamMembers.userId, userId))
      .orderBy(desc(events.createdAt)).limit(1).then(r => r[0] ?? null),
    db.select({ slug: events.slug, title: events.title })
      .from(eventRegistrations)
      .innerJoin(events, eq(events.id, eventRegistrations.eventId))
      .where(and(
        eq(eventRegistrations.userId, userId),
        eq(eventRegistrations.status, "approved"),
        notInArray(events.status, ["draft", "completed"]),
      ))
      .orderBy(desc(events.createdAt)).limit(1).then(r => r[0] ?? null),
    db.select({ id: mentorProfiles.id, eventSlug: events.slug })
      .from(mentorProfiles)
      .innerJoin(events, eq(events.id, mentorProfiles.eventId))
      .where(and(
        eq(mentorProfiles.userId, userId),
        notInArray(events.status, ["draft", "completed"]),
      ))
      .orderBy(desc(events.createdAt)).limit(1).then(r => r[0] ?? null),
  ]);

  const isPartner = partnerCount > 0;
  const isMentor = !!activeMentorProfile;

  const displayName = dbUser?.firstName && dbUser?.lastName
    ? `${dbUser.firstName} ${dbUser.lastName}`
    : dbUser?.name ?? dbUser?.email ?? "";
  const initials = displayName
    .split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
  const avatarSrc = dbUser?.avatarUrl ?? dbUser?.image;

  const eventSlug = activeEvent?.slug ?? myTeam?.eventSlug;

  return (
    <aside
      style={{ background: "var(--ink-900)", borderRight: "1px solid var(--line)" }}
      className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col"
    >
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center border-b px-5" style={{ borderColor: "var(--line)" }}>
        <Link href="/dashboard" className="flex flex-col leading-none">
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.12em", color: "var(--fg-3)", textTransform: "uppercase" }}>
            Deeptech
          </span>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "20px", color: "var(--fg-1)", letterSpacing: "-0.02em" }}>
            GigaHack<span style={{ color: "var(--green)" }} className="gh-cursor" />
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <SideNavLink href="/dashboard" icon={<LayoutDashboard size={16} />}>
          Home
        </SideNavLink>

        {admin ? (
          <>
            <SideNavLink href="/events" icon={<CalendarDays size={16} />}>Events</SideNavLink>
            <SideNavLink href="/admin/notifications" icon={<Bell size={16} />}>Broadcasts</SideNavLink>
          </>
        ) : eventSlug ? (
          <>
            <SideNavLink href={`/events/${eventSlug}`} icon={<CalendarDays size={16} />}>
              Event
            </SideNavLink>
            <SideNavLink href={`/events/${eventSlug}/schedule`} icon={<CalendarClock size={16} />}>
              Schedule
            </SideNavLink>
            <SideNavLink href={`/events/${eventSlug}/teams`} icon={<Users size={16} />}>
              Teams
            </SideNavLink>
            <SideNavLink href={`/events/${eventSlug}/challenges`} icon={<Lightbulb size={16} />}>
              Challenges
            </SideNavLink>
            <SideNavLink href={`/events/${eventSlug}/mentors`} icon={<GraduationCap size={16} />}>
              Mentors
            </SideNavLink>
            <SideNavLink href={`/events/${eventSlug}/partners`} icon={<Building2 size={16} />}>
              Partners
            </SideNavLink>
            <SideNavLink href="/profile" icon={<Rocket size={16} />}>
              Submit
            </SideNavLink>
          </>
        ) : (
          <SideNavLink href="/events" icon={<CalendarDays size={16} />}>Events</SideNavLink>
        )}

        {isMentor && activeMentorProfile && (
          <SideNavLink
            href={`/events/${activeMentorProfile.eventSlug}/mentors/${activeMentorProfile.id}/schedule`}
            icon={<GraduationCap size={16} />}
          >
            My Schedule
          </SideNavLink>
        )}
      </nav>

      {/* Bottom — track info + user */}
      <div className="shrink-0 border-t px-4 py-4 space-y-3" style={{ borderColor: "var(--line)" }}>
        {eventSlug && (
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.08em", color: "var(--fg-3)", textTransform: "uppercase" }}>
              Your Track
            </p>
            <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--fg-1)", marginTop: "2px" }}>
              {activeEvent?.title ?? "—"}
            </p>
          </div>
        )}

        <Link href="/profile" className="flex items-center gap-2.5 group">
          {avatarSrc ? (
            <img src={avatarSrc} alt={displayName}
              className="h-8 w-8 rounded-full object-cover shrink-0"
              style={{ outline: "1.5px solid var(--line-2)" }} />
          ) : (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: "var(--ink-650)", color: "var(--fg-1)" }}
            >
              {initials || "?"}
            </span>
          )}
          <div className="min-w-0">
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg-1)" }} className="truncate group-hover:text-[var(--green)] transition-colors">
              {displayName}
            </p>
            <p style={{ fontSize: "11px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
              {admin ? "Admin_" : isMentor ? "Mentor_" : isPartner ? "Partner_" : "Builder_"}
            </p>
          </div>
        </Link>

      </div>
    </aside>
  );
}

function SideNavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href as Route}
      className="gh-nav-link flex items-center gap-3 px-3 py-2 text-sm transition-colors"
      style={{
        color: "var(--fg-2)",
        fontFamily: "var(--font-ui)",
        fontWeight: 400,
      }}
    >
      <span style={{ color: "var(--fg-3)" }}>{icon}</span>
      {children}
    </Link>
  );
}
