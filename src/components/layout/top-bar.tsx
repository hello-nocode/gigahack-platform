import Link from "next/link";
import type { Route } from "next";
import { auth, signOut } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { db } from "@db/index";
import { users, partnerProfiles, mentorProfiles, events, teamMembers, teams, eventRegistrations } from "@db/schema";
import { and, desc, eq, notInArray } from "drizzle-orm";
import { UserCircle, LogOut, LayoutDashboard, CalendarDays, Shield, Building2, Users, Lightbulb, GraduationCap } from "lucide-react";

export async function TopBar() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;

  const [admin, dbUser, partnerCount, myTeam, activeEvent, activeMentorProfile] = await Promise.all([
    isAdmin(userId),
    db.select({ globalRole: users.globalRole, firstName: users.firstName, lastName: users.lastName, name: users.name, email: users.email, image: users.image, avatarUrl: users.avatarUrl })
      .from(users).where(eq(users.id, userId)).then((r) => r[0] ?? null),
    db.select({ id: partnerProfiles.id }).from(partnerProfiles).where(eq(partnerProfiles.userId, userId)).then((r) => r.length),
    db.select({ teamId: teamMembers.teamId, eventSlug: events.slug })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .innerJoin(events, eq(events.id, teams.eventId))
      .where(eq(teamMembers.userId, userId))
      .orderBy(desc(events.createdAt))
      .limit(1)
      .then((r) => r[0] ?? null),
    db.select({ slug: events.slug, title: events.title })
      .from(eventRegistrations)
      .innerJoin(events, eq(events.id, eventRegistrations.eventId))
      .where(and(
        eq(eventRegistrations.userId, userId),
        eq(eventRegistrations.status, "approved"),
        notInArray(events.status, ["draft", "completed"]),
      ))
      .orderBy(desc(events.createdAt))
      .limit(1)
      .then((r) => r[0] ?? null),
    db.select({ id: mentorProfiles.id, eventSlug: events.slug })
      .from(mentorProfiles)
      .innerJoin(events, eq(events.id, mentorProfiles.eventId))
      .where(
        and(
          eq(mentorProfiles.userId, userId),
          notInArray(events.status, ["draft", "completed"]),
        ),
      )
      .orderBy(desc(events.createdAt))
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);

  const isPartner = partnerCount > 0;
  const isMentor = !!activeMentorProfile;
  const displayName = dbUser?.firstName && dbUser?.lastName
    ? `${dbUser.firstName} ${dbUser.lastName}`
    : dbUser?.name ?? dbUser?.email ?? "";
  const avatarSrc = dbUser?.avatarUrl ?? dbUser?.image;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-700/60 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">

        {/* Left — brand + nav */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight text-white">
            <span className="text-blue-400">⚡</span> Gigahack
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink href="/dashboard" icon={<LayoutDashboard className="h-3.5 w-3.5" />}>
              Dashboard
            </NavLink>
            {admin ? (
              <>
                <NavLink href="/events" icon={<CalendarDays className="h-3.5 w-3.5" />}>
                  Events
                </NavLink>
              </>
            ) : activeEvent ? (
              <>
                <NavLink href={`/events/${activeEvent.slug}`} icon={<CalendarDays className="h-3.5 w-3.5" />}>
                  {activeEvent.title}
                </NavLink>
                <NavLink href={`/events/${activeEvent.slug}/challenges`} icon={<Lightbulb className="h-3.5 w-3.5" />}>
                  Challenges
                </NavLink>
                <NavLink href={`/events/${activeEvent.slug}/teams`} icon={<Users className="h-3.5 w-3.5" />}>
                  Teams
                </NavLink>
                {myTeam && myTeam.eventSlug === activeEvent.slug && (
                  <NavLink href={`/events/${myTeam.eventSlug}/teams/${myTeam.teamId}`} icon={<Users className="h-3.5 w-3.5" />}>
                    My Team
                  </NavLink>
                )}
              </>
            ) : (
              <NavLink href="/events" icon={<CalendarDays className="h-3.5 w-3.5" />}>
                Events
              </NavLink>
            )}
            {isMentor && activeMentorProfile && (
              <NavLink href={`/events/${activeMentorProfile.eventSlug}/mentors/${activeMentorProfile.id}/schedule`} icon={<GraduationCap className="h-3.5 w-3.5" />}>
                My Schedule
              </NavLink>
            )}
            {isPartner && (
              <NavLink href="/events" icon={<Building2 className="h-3.5 w-3.5" />}>
                My Challenges
              </NavLink>
            )}
          </nav>
        </div>

        {/* Right — role badge + profile + sign-out */}
        <div className="flex items-center gap-3">
          {/* Role badge */}
          {admin ? (
            <span className="hidden rounded-full bg-blue-600/30 px-2.5 py-0.5 text-xs font-semibold text-blue-300 sm:inline-flex items-center gap-1">
              <Shield className="h-3 w-3" /> Admin
            </span>
          ) : isMentor ? (
            <span className="hidden rounded-full bg-teal-600/30 px-2.5 py-0.5 text-xs font-semibold text-teal-300 sm:inline-flex items-center gap-1">
              <GraduationCap className="h-3 w-3" /> Mentor
            </span>
          ) : isPartner ? (
            <span className="hidden rounded-full bg-violet-600/30 px-2.5 py-0.5 text-xs font-semibold text-violet-300 sm:inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" /> Partner
            </span>
          ) : (
            <span className="hidden rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-semibold text-slate-400 sm:inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> Participant
            </span>
          )}

          {/* Profile link */}
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            title="Edit profile"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt={displayName} className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-600" />
            ) : (
              <UserCircle className="h-5 w-5 text-slate-400" />
            )}
            <span className="hidden max-w-[120px] truncate sm:inline">{displayName}</span>
          </Link>

          {/* Sign-out */}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function NavLink({
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
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
    >
      {icon}
      {children}
    </Link>
  );
}
