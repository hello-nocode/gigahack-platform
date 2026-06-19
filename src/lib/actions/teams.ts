"use server";

import { db } from "@db/index";
import {
  teams,
  teamMembers,
  teamChallengeApplications,
  teamJoinRequests,
  eventRegistrations,
  events,
  challenges,
  users,
} from "@db/schema";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { eq, and, count, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { z } from "zod";
import { createNotification, sendNotificationEmail, getOrCreatePreferences } from "@/lib/actions/notifications";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

async function requireAdmin(): Promise<string | null> {
  const userId = await requireUser();
  const admin = await isAdmin(userId);
  return admin ? userId : null;
}

export async function getUserTeamForEvent(userId: string, eventId: string) {
  const membership = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(eq(teamMembers.userId, userId), eq(teams.eventId, eventId)));
  return membership[0]?.teamId ?? null;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getTeam(teamId: string) {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  return team ?? null;
}

export async function getTeamWithMembers(teamId: string) {
  const team = await getTeam(teamId);
  if (!team) return null;
  const members = await db
    .select({
      id: teamMembers.id,
      userId: teamMembers.userId,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
      name: users.name,
      email: users.email,
      image: users.image,
      avatarUrl: users.avatarUrl,
      phone: users.phone,
    })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .where(eq(teamMembers.teamId, teamId));
  return { ...team, members };
}

export async function getTeamsForEvent(eventId: string) {
  return db
    .select({
      id: teams.id,
      name: teams.name,
      status: teams.status,
      leaderId: teams.leaderId,
      createdAt: teams.createdAt,
    })
    .from(teams)
    .where(eq(teams.eventId, eventId))
    .orderBy(teams.createdAt);
}

export async function getUserTeamInEvent(eventId: string) {
  const userId = await requireUser();
  const teamId = await getUserTeamForEvent(userId, eventId);
  if (!teamId) return null;
  return getTeamWithMembers(teamId);
}

export async function getTeamApplications(teamId: string) {
  return db
    .select({
      id: teamChallengeApplications.id,
      challengeId: teamChallengeApplications.challengeId,
      status: teamChallengeApplications.status,
      note: teamChallengeApplications.note,
      createdAt: teamChallengeApplications.createdAt,
      challengeTitle: challenges.title,
      challengeSlug: challenges.slug,
    })
    .from(teamChallengeApplications)
    .innerJoin(challenges, eq(challenges.id, teamChallengeApplications.challengeId))
    .where(eq(teamChallengeApplications.teamId, teamId));
}

// ── Create team ───────────────────────────────────────────────────────────────

const createTeamSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(500).optional(),
});

export type TeamFormState =
  | { success: true; teamId: string; error?: never }
  | { success?: never; error: string };

export async function createTeam(
  eventId: string,
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const userId = await requireUser();

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return { error: "Event not found" };
  if (event.status === "completed") return { error: "This event is completed and can no longer be modified" };

  const [reg] = await db
    .select({ status: eventRegistrations.status })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)));
  if (!reg || reg.status !== "approved") return { error: "You must be a registered participant to create a team" };

  const existingTeamId = await getUserTeamForEvent(userId, eventId);
  if (existingTeamId) return { error: "You are already in a team for this event" };

  const raw = Object.fromEntries(formData);
  const parsed = createTeamSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(", ") };

  const inviteCode = randomBytes(8).toString("hex");

  const inserted = await db
    .insert(teams)
    .values({
      eventId,
      name: parsed.data.name,
      description: parsed.data.description,
      leaderId: userId,
      inviteCode,
    })
    .returning({ id: teams.id });
  const teamId2 = inserted[0]?.id;
  if (!teamId2) return { error: "Failed to create team" };

  await db.insert(teamMembers).values({
    teamId: teamId2,
    userId,
    role: "leader",
  });

  revalidatePath(`/events/${event.slug}/teams`);
  return { success: true, teamId: teamId2 };
}

// ── Update team ───────────────────────────────────────────────────────────────

export async function updateTeam(
  teamId: string,
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const userId = await requireUser();
  const admin = await isAdmin(userId);

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return { error: "Team not found" };
  if (team.leaderId !== userId && !admin) return { error: "Not authorised" };

  const [teamEvent] = await db.select({ status: events.status }).from(events).where(eq(events.id, team.eventId));
  if (teamEvent?.status === "completed") return { error: "This event is completed and can no longer be modified" };

  const raw = Object.fromEntries(formData);
  const parsed = createTeamSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(", ") };

  await db
    .update(teams)
    .set({ name: parsed.data.name, description: parsed.data.description, updatedAt: new Date() })
    .where(eq(teams.id, teamId));

  const [event] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, team.eventId));
  revalidatePath(`/events/${event?.slug}/teams/${teamId}`);
  return { success: true, teamId };
}

export type JoinSettingState =
  | { success: true; acceptingNewMembers: boolean; error?: never }
  | { success?: never; error: string };

export async function updateTeamJoinSetting(
  teamId: string,
  acceptingNewMembers: boolean,
): Promise<JoinSettingState> {
  const userId = await requireUser();
  const admin = await isAdmin(userId);

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return { error: "Team not found" };
  if (team.leaderId !== userId && !admin) return { error: "Not authorised" };

  const [teamEvent] = await db.select({ status: events.status, minTeamSize: events.minTeamSize, maxTeamSize: events.maxTeamSize }).from(events).where(eq(events.id, team.eventId));
  if (teamEvent?.status === "completed") return { error: "This event is completed and can no longer be modified" };

  // Get current member count
  const memberRows = await db
    .select({ count: count() })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  const memberCount = memberRows[0]?.count ?? 0;
  const minSize = teamEvent?.minTeamSize ?? 2;
  const maxSize = teamEvent?.maxTeamSize ?? 5;

  // If team is full, cannot enable accepting new members
  if (acceptingNewMembers && memberCount >= maxSize) {
    return { error: `Cannot enable: team is already full (${memberCount}/${maxSize} members)` };
  }

  // If team is below minimum size, cannot disable accepting new members
  if (!acceptingNewMembers && memberCount < minSize) {
    return { error: `Cannot disable: team needs at least ${minSize} members (currently ${memberCount})` };
  }

  await db
    .update(teams)
    .set({ acceptingNewMembers, updatedAt: new Date() })
    .where(eq(teams.id, teamId));

  revalidatePath(`/events/${teamEvent ? await db.select({ slug: events.slug }).from(events).where(eq(events.id, team.eventId)).then(r => r[0]?.slug) : ""}/teams/${teamId}`);
  return { success: true, acceptingNewMembers };
}

// ── Join requests ─────────────────────────────────────────────────────────────

export type JoinRequestState =
  | { success: true; error?: never }
  | { success?: never; error: string };

export async function requestJoinTeam(
  teamId: string,
  message?: string,
): Promise<JoinRequestState> {
  const userId = await requireUser();

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return { error: "Team not found" };
  if (!team.acceptingNewMembers) return { error: "This team is not accepting new members" };

  const [reqEvent] = await db.select({ status: events.status }).from(events).where(eq(events.id, team.eventId));
  if (reqEvent?.status === "completed") return { error: "This event is completed and can no longer be modified" };

  const [reg] = await db
    .select({ status: eventRegistrations.status })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, team.eventId), eq(eventRegistrations.userId, userId)));
  if (!reg || reg.status !== "approved") return { error: "You must be a registered participant to join a team" };

  const existingTeamId = await getUserTeamForEvent(userId, team.eventId);
  if (existingTeamId) return { error: "You are already in a team for this event" };

  const [existing] = await db
    .select()
    .from(teamJoinRequests)
    .where(and(eq(teamJoinRequests.teamId, teamId), eq(teamJoinRequests.userId, userId)));
  if (existing && existing.status === "pending")
    return { error: "You already have a pending request to this team" };
  if (existing && existing.status === "rejected")
    return { error: "Your previous request was rejected" };

  if (existing) {
    await db
      .update(teamJoinRequests)
      .set({ status: "pending", message: message ?? null, updatedAt: new Date() })
      .where(eq(teamJoinRequests.id, existing.id));
  } else {
    await db.insert(teamJoinRequests).values({ teamId, userId, message });
  }

  // Notify team leader about new join request
  if (team?.leaderId) {
    const [requester] = await db
      .select({ name: users.name, firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(users)
      .where(eq(users.id, userId));
    const requesterName = requester?.firstName && requester?.lastName
      ? `${requester.firstName} ${requester.lastName}`
      : requester?.name ?? requester?.email ?? "Someone";
    const title = "New join request";
    const body = `${requesterName} wants to join your team ${team.name}.`;
    const link = `/events/${(await db.select({ slug: events.slug }).from(events).where(eq(events.id, team.eventId)).then(r => r[0]?.slug))}/teams/${teamId}`;
    await createNotification({ userId: team.leaderId, eventId: team.eventId, type: "join_request_received", title, body, link });
    const prefs = await getOrCreatePreferences(team.leaderId);
    if (prefs?.emailOnJoinRequest) void sendNotificationEmail(team.leaderId, title, body, link);
  }

  revalidatePath(`/events`);
  return { success: true };
}

export async function cancelJoinRequest(requestId: string): Promise<JoinRequestState> {
  const userId = await requireUser();

  const [req] = await db
    .select()
    .from(teamJoinRequests)
    .where(eq(teamJoinRequests.id, requestId));
  if (!req) return { error: "Request not found" };
  if (req.userId !== userId) return { error: "Not authorised" };
  if (req.status !== "pending") return { error: "Can only cancel pending requests" };

  await db
    .update(teamJoinRequests)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(teamJoinRequests.id, requestId));

  revalidatePath(`/events`);
  return { success: true };
}

export async function reviewJoinRequest(
  requestId: string,
  decision: "accepted" | "rejected",
): Promise<JoinRequestState> {
  const userId = await requireUser();

  const [req] = await db
    .select()
    .from(teamJoinRequests)
    .where(eq(teamJoinRequests.id, requestId));
  if (!req) return { error: "Request not found" };
  if (req.status !== "pending") return { error: "Request is no longer pending" };

  const [team] = await db.select().from(teams).where(eq(teams.id, req.teamId));
  const admin = await isAdmin(userId);
  if (team?.leaderId !== userId && !admin) return { error: "Not authorised" };

  if (team) {
    const [reviewEvent] = await db.select({ status: events.status }).from(events).where(eq(events.id, team.eventId));
    if (reviewEvent?.status === "completed") return { error: "This event is completed and can no longer be modified" };
  }

  await db
    .update(teamJoinRequests)
    .set({ status: decision, reviewedBy: userId, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(teamJoinRequests.id, requestId));

  if (decision === "accepted" && team) {
    const countRows = await db
      .select({ memberCount: count() })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, req.teamId));
    const memberCount = countRows[0]?.memberCount ?? 0;

    const [event] = await db
      .select({ maxTeamSize: events.maxTeamSize })
      .from(events)
      .where(eq(events.id, team.eventId));

    if (memberCount >= (event?.maxTeamSize ?? 5))
      return { error: `Team is full (max ${event?.maxTeamSize ?? 5} members)` };

    await db.insert(teamMembers).values({ teamId: req.teamId, userId: req.userId, role: "member" });

    // Cancel all other pending requests from this user for the same event
    const otherRequests = await db
      .select({ id: teamJoinRequests.id })
      .from(teamJoinRequests)
      .innerJoin(teams, eq(teams.id, teamJoinRequests.teamId))
      .where(
        and(
          eq(teamJoinRequests.userId, req.userId),
          eq(teamJoinRequests.status, "pending"),
          eq(teams.eventId, team.eventId),
          ne(teamJoinRequests.id, requestId),
        ),
      );

    if (otherRequests.length > 0) {
      await db
        .update(teamJoinRequests)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(inArray(teamJoinRequests.id, otherRequests.map((r) => r.id)));
    }
  }

  // Notify requester about the decision
  if (team) {
    const [eventSlug] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, team.eventId));
    const title = decision === "accepted" ? "Join request accepted" : "Join request rejected";
    const body = decision === "accepted"
      ? `Your request to join team "${team.name}" has been accepted. Welcome!`
      : `Your request to join team "${team.name}" was not accepted.`;
    const link = decision === "accepted" ? `/events/${eventSlug?.slug}/teams/${req.teamId}` : null;
    await createNotification({ userId: req.userId, eventId: team.eventId, type: "join_request_reviewed", title, body, link: link ?? undefined });
    const prefs = await getOrCreatePreferences(req.userId);
    if (prefs?.emailOnJoinReviewed) void sendNotificationEmail(req.userId, title, body, link);
  }

  revalidatePath(`/events`);
  return { success: true };
}

export async function getJoinRequestsForTeam(teamId: string) {
  return db
    .select({
      id: teamJoinRequests.id,
      userId: teamJoinRequests.userId,
      status: teamJoinRequests.status,
      message: teamJoinRequests.message,
      createdAt: teamJoinRequests.createdAt,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(teamJoinRequests)
    .innerJoin(users, eq(users.id, teamJoinRequests.userId))
    .where(eq(teamJoinRequests.teamId, teamId))
    .orderBy(teamJoinRequests.createdAt);
}

export async function getUserJoinRequestsForEvent(eventId: string) {
  const userId = await requireUser();
  return db
    .select({
      id: teamJoinRequests.id,
      teamId: teamJoinRequests.teamId,
      status: teamJoinRequests.status,
      message: teamJoinRequests.message,
      createdAt: teamJoinRequests.createdAt,
      teamName: teams.name,
    })
    .from(teamJoinRequests)
    .innerJoin(teams, eq(teams.id, teamJoinRequests.teamId))
    .where(and(eq(teamJoinRequests.userId, userId), eq(teams.eventId, eventId)))
    .orderBy(teamJoinRequests.createdAt);
}

// ── Leave team ────────────────────────────────────────────────────────────────

export async function leaveTeam(teamId: string): Promise<{ error?: string }> {
  const userId = await requireUser();

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return { error: "Team not found" };
  if (team.leaderId === userId) return { error: "Leader cannot leave \u2014 transfer leadership or disband the team" };

  const [leaveEvent] = await db.select({ status: events.status }).from(events).where(eq(events.id, team.eventId));
  if (leaveEvent?.status === "completed") return { error: "This event is completed and can no longer be modified" };

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

  const [event] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, team.eventId));
  revalidatePath(`/events/${event?.slug}/teams`);
  return {};
}

// ── Transfer leadership ─────────────────────────────────────────────────────

export async function transferLeadership(
  teamId: string,
  newLeaderId: string,
): Promise<{ error?: string }> {
  const userId = await requireUser();

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return { error: "Team not found" };
  if (team.leaderId !== userId) return { error: "Only the current leader can transfer leadership" };
  if (newLeaderId === userId) return { error: "You are already the leader" };

  const [transferEvent] = await db.select({ status: events.status }).from(events).where(eq(events.id, team.eventId));
  if (transferEvent?.status === "completed") return { error: "This event is completed and can no longer be modified" };

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, newLeaderId)));
  if (!member) return { error: "User is not a member of this team" };

  await db.update(teams).set({ leaderId: newLeaderId, updatedAt: new Date() }).where(eq(teams.id, teamId));
  await db.update(teamMembers).set({ role: "member" }).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  await db.update(teamMembers).set({ role: "leader" }).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, newLeaderId)));

  const [event] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, team.eventId));
  revalidatePath(`/events/${event?.slug}/teams`);
  revalidatePath(`/events/${event?.slug}/teams/${teamId}`);
  return {};
}

// ── Remove member (leader only) ───────────────────────────────────────────────

export async function removeMember(teamId: string, memberId: string): Promise<{ error?: string }> {
  const userId = await requireUser();
  const admin = await isAdmin(userId);

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return { error: "Team not found" };
  if (team.leaderId !== userId && !admin) return { error: "Not authorised" };
  if (memberId === team.leaderId) return { error: "Cannot remove the leader" };

  const [removeEvent] = await db.select({ status: events.status }).from(events).where(eq(events.id, team.eventId));
  if (removeEvent?.status === "completed") return { error: "This event is completed and can no longer be modified" };

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, memberId)));

  // Reset the join request so the removed user sees "Request to Join" again instead of "Member ✓"
  await db
    .update(teamJoinRequests)
    .set({ status: "cancelled" })
    .where(and(eq(teamJoinRequests.teamId, teamId), eq(teamJoinRequests.userId, memberId)));

  const [event] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, team.eventId));
  revalidatePath(`/events/${event?.slug}/teams`);
  revalidatePath(`/events/${event?.slug}/teams/${teamId}`);
  return {};
}

// ── Challenge applications ────────────────────────────────────────────────────

export type ApplicationState =
  | { success: true; error?: never }
  | { success?: never; error: string };

// ── Slot Availability Helpers ────────────────────────────────────────────────

export async function getChallengeSlotInfo(challengeId: string) {
  const [challenge] = await db
    .select({ maxTeams: challenges.maxTeams })
    .from(challenges)
    .where(eq(challenges.id, challengeId));
  
  if (!challenge) return null;
  
  const maxSlots = challenge.maxTeams ?? 5; // default 5 slots
  
  const acceptedCount = await db
    .select({ c: count() })
    .from(teamChallengeApplications)
    .where(
      and(
        eq(teamChallengeApplications.challengeId, challengeId),
        eq(teamChallengeApplications.status, "accepted"),
      ),
    )
    .then(r => r[0]?.c ?? 0);
  
  return {
    maxSlots,
    acceptedCount,
    availableSlots: Math.max(0, maxSlots - acceptedCount),
    isFull: acceptedCount >= maxSlots,
  };
}

export async function getTeamCurrentChallenge(teamId: string): Promise<string | null> {
  const [app] = await db
    .select({ challengeId: teamChallengeApplications.challengeId })
    .from(teamChallengeApplications)
    .where(
      and(
        eq(teamChallengeApplications.teamId, teamId),
        inArray(teamChallengeApplications.status, ["pending", "accepted"]),
      ),
    )
    .limit(1);
  return app?.challengeId ?? null;
}

export async function applyToChallenge(
  teamId: string,
  challengeId: string,
  note?: string,
): Promise<ApplicationState> {
  const userId = await requireUser();

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return { error: "Team not found" };
  if (team.leaderId !== userId) return { error: "Only the team leader can apply to challenges" };

  // Check if applications are open
  const [event] = await db
    .select({ 
      applicationsOpen: events.applicationsOpen, 
      minTeamSize: events.minTeamSize, 
      status: events.status 
    })
    .from(events)
    .where(eq(events.id, team.eventId));

  if (event?.status === "completed") return { error: "This event is completed and can no longer be modified" };
  if (!event?.applicationsOpen) return { error: "Challenge applications are currently closed" };

  // Check if team already has any active application (single application only)
  const existingChallenge = await getTeamCurrentChallenge(teamId);
  if (existingChallenge) {
    return { error: "Your team already has an active challenge application. Withdraw first to apply to a different challenge." };
  }

  const [existing] = await db
    .select()
    .from(teamChallengeApplications)
    .where(
      and(
        eq(teamChallengeApplications.teamId, teamId),
        eq(teamChallengeApplications.challengeId, challengeId),
      ),
    );
  if (existing) return { error: "Already applied to this challenge" };

  const memberCountRows = await db
    .select({ c: count() })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  const memberCount = memberCountRows[0]?.c ?? 0;
  const minSize = event?.minTeamSize ?? 2;
  if (memberCount < minSize)
    return { error: `Team needs at least ${minSize} members to apply to a challenge (currently ${memberCount})` };

  // Check slot availability
  const slotInfo = await getChallengeSlotInfo(challengeId);
  if (!slotInfo) return { error: "Challenge not found" };
  if (slotInfo.isFull) return { error: "This challenge has no available slots" };

  // Create application (pending - admin needs to approve)
  await db.insert(teamChallengeApplications).values({
    teamId,
    challengeId,
    note,
    status: "pending",
  });

  revalidatePath(`/events`);
  return { success: true };
}

export async function changeChallengeApplication(
  teamId: string,
  newChallengeId: string,
  note?: string,
): Promise<ApplicationState> {
  const userId = await requireUser();

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return { error: "Team not found" };
  if (team.leaderId !== userId) return { error: "Only the team leader can change challenge applications" };

  // Check if applications are open
  const [event] = await db
    .select({ applicationsOpen: events.applicationsOpen, status: events.status })
    .from(events)
    .where(eq(events.id, team.eventId));

  if (event?.status === "completed") return { error: "This event is completed and can no longer be modified" };
  if (!event?.applicationsOpen) return { error: "Challenge applications are closed. Contact an admin to change your challenge." };

  // Get current application
  const [currentApp] = await db
    .select()
    .from(teamChallengeApplications)
    .where(
      and(
        eq(teamChallengeApplications.teamId, teamId),
        inArray(teamChallengeApplications.status, ["pending", "accepted"]),
      ),
    );

  if (!currentApp) return { error: "No active challenge application to change" };
  if (currentApp.challengeId === newChallengeId) return { error: "Already applied to this challenge" };

  // Check slot availability on new challenge
  const slotInfo = await getChallengeSlotInfo(newChallengeId);
  if (!slotInfo) return { error: "Challenge not found" };
  if (slotInfo.isFull) return { error: "This challenge has no available slots" };

  // Withdraw current and apply to new
  await db
    .update(teamChallengeApplications)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(eq(teamChallengeApplications.id, currentApp.id));

  await db.insert(teamChallengeApplications).values({
    teamId,
    challengeId: newChallengeId,
    note,
    status: "pending",
  });

  revalidatePath(`/events`);
  return { success: true };
}

export async function withdrawApplication(applicationId: string): Promise<ApplicationState> {
  const userId = await requireUser();

  const [app] = await db
    .select({ teamId: teamChallengeApplications.teamId })
    .from(teamChallengeApplications)
    .where(eq(teamChallengeApplications.id, applicationId));
  if (!app) return { error: "Application not found" };

  const [team] = await db.select().from(teams).where(eq(teams.id, app.teamId));
  if (team?.leaderId !== userId) return { error: "Not authorised" };

  if (team) {
    const [withdrawEvent] = await db.select({ status: events.status }).from(events).where(eq(events.id, team.eventId));
    if (withdrawEvent?.status === "completed") return { error: "This event is completed and can no longer be modified" };
  }

  await db
    .update(teamChallengeApplications)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(eq(teamChallengeApplications.id, applicationId));

  revalidatePath(`/events`);
  return { success: true };
}

// ── Admin: Move team from one challenge to another ─────────────────────────────

export async function adminMoveTeamChallenge(
  teamId: string,
  newChallengeId: string,
  note?: string,
): Promise<ApplicationState> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorised" };

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return { error: "Team not found" };

  // Get current active application
  const [currentApp] = await db
    .select()
    .from(teamChallengeApplications)
    .where(
      and(
        eq(teamChallengeApplications.teamId, teamId),
        inArray(teamChallengeApplications.status, ["pending", "accepted"]),
      ),
    );

  // Check if target challenge exists and get its slot info
  const slotInfo = await getChallengeSlotInfo(newChallengeId);
  if (!slotInfo) return { error: "Target challenge not found" };

  // Admin can override slot limits, but we warn if challenge is full
  // We'll allow the move even if full (admin discretion)

  if (currentApp) {
    if (currentApp.challengeId === newChallengeId) {
      return { error: "Team is already on this challenge" };
    }

    // Withdraw current application
    await db
      .update(teamChallengeApplications)
      .set({ status: "withdrawn", updatedAt: new Date() })
      .where(eq(teamChallengeApplications.id, currentApp.id));
  }

  // Create new application (auto-accepted for admin moves)
  await db.insert(teamChallengeApplications).values({
    teamId,
    challengeId: newChallengeId,
    note: note || `Moved by admin: ${adminId}`,
    status: "accepted",
  });

  revalidatePath(`/events`);
  return { success: true };
}

export async function getApplicationsForChallenge(challengeId: string) {
  return db
    .select({
      id: teamChallengeApplications.id,
      teamId: teamChallengeApplications.teamId,
      status: teamChallengeApplications.status,
      note: teamChallengeApplications.note,
      createdAt: teamChallengeApplications.createdAt,
      teamName: teams.name,
    })
    .from(teamChallengeApplications)
    .innerJoin(teams, eq(teams.id, teamChallengeApplications.teamId))
    .where(eq(teamChallengeApplications.challengeId, challengeId))
    .orderBy(teamChallengeApplications.createdAt);
}
