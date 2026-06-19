"use server";

import { db } from "@db/index";
import {
  notifications,
  notificationPreferences,
  scheduledBroadcasts,
  users,
  teams,
  teamMembers,
  eventRoles,
  eventRegistrations,
  teamChallengeApplications,
} from "@db/schema";
import type { NewNotification } from "@db/schema";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendEmail, notificationEmailHtml } from "@/lib/email";
import { inngest } from "@/lib/inngest/client";
import { env } from "@/lib/validations/env";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function getOrCreatePreferences(userId: string) {
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));
  if (prefs) return prefs;
  const [created] = await db
    .insert(notificationPreferences)
    .values({ userId })
    .returning();
  return created;
}

export async function createNotification(data: NewNotification) {
  const [n] = await db.insert(notifications).values(data).returning();
  return n;
}

export async function sendNotificationEmail(
  userId: string,
  title: string,
  body: string,
  link?: string | null,
) {
  const [user] = await db
    .select({ email: users.email, name: users.name, firstName: users.firstName })
    .from(users)
    .where(eq(users.id, userId));
  if (!user?.email) return;

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  await sendEmail({
    to: user.email,
    subject: title,
    html: notificationEmailHtml(title, body, link, appUrl),
    text: `${title}\n\n${body}${link ? `\n\n${appUrl}${link}` : ""}`,
  });
}

// ── Public actions ────────────────────────────────────────────────────────────

export async function getMyNotifications() {
  const userId = await requireUser();
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function getUnreadCount() {
  const userId = await requireUser();
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows.length;
}

export async function markAsRead(notificationId: string) {
  const userId = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  revalidatePath("/");
}

export async function markAllRead() {
  const userId = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  revalidatePath("/");
}

export async function getMyPreferences() {
  const userId = await requireUser();
  return getOrCreatePreferences(userId);
}

export type PreferencesState =
  | { success: true; error?: never }
  | { success?: never; error: string };

export async function savePreferences(
  _prev: PreferencesState,
  formData: FormData,
): Promise<PreferencesState> {
  const userId = await requireUser();
  const bool = (key: string) => formData.get(key) === "on";
  await db
    .insert(notificationPreferences)
    .values({
      userId,
      emailOnMentorBooked: bool("emailOnMentorBooked"),
      emailOnSessionReminder: bool("emailOnSessionReminder"),
      emailOnJoinRequest: bool("emailOnJoinRequest"),
      emailOnJoinReviewed: bool("emailOnJoinReviewed"),
      emailOnAdminBroadcast: bool("emailOnAdminBroadcast"),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: {
        emailOnMentorBooked: bool("emailOnMentorBooked"),
        emailOnSessionReminder: bool("emailOnSessionReminder"),
        emailOnJoinRequest: bool("emailOnJoinRequest"),
        emailOnJoinReviewed: bool("emailOnJoinReviewed"),
        emailOnAdminBroadcast: bool("emailOnAdminBroadcast"),
        updatedAt: new Date(),
      },
    });
  revalidatePath("/profile/notifications");
  return { success: true };
}

// ── Admin broadcast ───────────────────────────────────────────────────────────

export async function getScheduledBroadcasts(eventId?: string) {
  const userId = await requireUser();
  const admin = await isAdmin(userId);
  if (!admin) throw new Error("Not authorised");

  const rows = await db
    .select()
    .from(scheduledBroadcasts)
    .orderBy(desc(scheduledBroadcasts.createdAt))
    .limit(50);

  return eventId ? rows.filter((r) => r.eventId === eventId) : rows;
}

export type BroadcastState =
  | { success: true; error?: never }
  | { success?: never; error: string };

export async function createAdminBroadcast(
  _prev: BroadcastState,
  formData: FormData,
): Promise<BroadcastState> {
  const userId = await requireUser();
  const admin = await isAdmin(userId);
  if (!admin) return { error: "Not authorised" };

  const title = (formData.get("title") as string | null)?.trim();
  const body = (formData.get("body") as string | null)?.trim();
  const link = (formData.get("link") as string | null)?.trim() || null;
  const sendAtRaw = formData.get("sendAt") as string | null;
  const eventId = (formData.get("eventId") as string | null) || null;

  if (!title || !body) return { error: "Title and body are required" };

  const sendAt = sendAtRaw ? new Date(sendAtRaw) : new Date();

  // Build filter object
  const filterRoles = formData.getAll("filterRole") as string[];
  const filterTeamIds = formData.getAll("filterTeamId") as string[];
  const filterUserIds = formData.getAll("filterUserId") as string[];
  const filterChallengeId = (formData.get("filterChallengeId") as string | null) || null;

  const filter = {
    roles: filterRoles.length ? filterRoles : [],
    teamIds: filterTeamIds.length ? filterTeamIds : [],
    userIds: filterUserIds.length ? filterUserIds : [],
    challengeId: filterChallengeId,
    all: !filterRoles.length && !filterTeamIds.length && !filterUserIds.length && !filterChallengeId,
  };

  const inserted = await db
    .insert(scheduledBroadcasts)
    .values({ title, body, link, filter, sendAt, eventId, creatorId: userId })
    .returning();
  const broadcast = inserted[0];
  if (!broadcast) return { error: "Failed to create broadcast" };

  const isImmediate = sendAt.getTime() <= Date.now() + 5_000; // within 5s = send now

  if (isImmediate) {
    // Execute directly without Inngest
    const recipientIds = await resolveBroadcastRecipients(broadcast.id);

    if (recipientIds.length > 0) {
      // Batch insert notifications instead of one INSERT per recipient
      const rows: NewNotification[] = recipientIds.map((recipientId) => ({
        userId: recipientId,
        eventId: broadcast.eventId ?? undefined,
        type: "admin_broadcast",
        title: broadcast.title,
        body: broadcast.body,
        link: broadcast.link ?? undefined,
      }));
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        await db.insert(notifications).values(rows.slice(i, i + CHUNK));
      }

      // One query for all preferences; users without a row use the default (opted in)
      const prefRows = await db
        .select({
          userId: notificationPreferences.userId,
          emailOnAdminBroadcast: notificationPreferences.emailOnAdminBroadcast,
        })
        .from(notificationPreferences)
        .where(inArray(notificationPreferences.userId, recipientIds));
      const optedOut = new Set(
        prefRows.filter((p) => !p.emailOnAdminBroadcast).map((p) => p.userId),
      );

      for (const recipientId of recipientIds) {
        if (optedOut.has(recipientId)) continue;
        void sendNotificationEmail(recipientId, broadcast.title, broadcast.body, broadcast.link).catch(
          (err) => console.error(`[broadcast] email failed for ${recipientId}:`, err),
        );
      }
    }

    await db
      .update(scheduledBroadcasts)
      .set({ sentAt: new Date(), recipientCount: recipientIds.length })
      .where(eq(scheduledBroadcasts.id, broadcast.id));
  } else {
    // Schedule via Inngest — gracefully skip if not configured
    try {
      await inngest.send({
        name: "admin.broadcast.scheduled",
        data: { broadcastId: broadcast.id },
        ts: sendAt.getTime(),
      });
    } catch (err) {
      console.warn("[inngest] Could not schedule broadcast (key not configured?):", err);
    }
  }

  revalidatePath("/admin/notifications");
  return { success: true };
}

// ── Resolve recipients for a broadcast filter ─────────────────────────────────

export async function resolveBroadcastRecipients(broadcastId: string): Promise<string[]> {
  const rows = await db
    .select()
    .from(scheduledBroadcasts)
    .where(eq(scheduledBroadcasts.id, broadcastId));
  const broadcast = rows[0];
  if (!broadcast) return [];

  const filter = broadcast.filter as {
    all?: boolean;
    roles?: string[];
    teamIds?: string[];
    userIds?: string[];
    challengeId?: string | null;
  };

  const userIdSet = new Set<string>();

  if (filter.all) {
    if (broadcast.eventId) {
      // All approved registrants for the chosen event
      const registrations = await db
        .select({ userId: eventRegistrations.userId })
        .from(eventRegistrations)
        .where(
          and(
            eq(eventRegistrations.eventId, broadcast.eventId),
            eq(eventRegistrations.status, "approved"),
          ),
        );
      registrations.forEach((r) => userIdSet.add(r.userId));
    } else {
      // No event filter → all users on the platform
      const allUsers = await db.select({ id: users.id }).from(users);
      allUsers.forEach((u) => userIdSet.add(u.id));
    }
  }

  if (filter.roles?.length) {
    const validRoles = ["admin", "partner_admin", "mentor", "coach", "jury", "participant"] as const;
    type ValidRole = typeof validRoles[number];
    for (const role of filter.roles) {
      if (!validRoles.includes(role as ValidRole)) continue;
      const roleRows = await db
        .select({ userId: eventRoles.userId })
        .from(eventRoles)
        .where(
          broadcast.eventId
            ? and(eq(eventRoles.eventId, broadcast.eventId), eq(eventRoles.role, role as ValidRole))
            : eq(eventRoles.role, role as ValidRole),
        );
      roleRows.forEach((r) => userIdSet.add(r.userId));
    }
  }

  if (filter.teamIds?.length) {
    const members = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(inArray(teamMembers.teamId, filter.teamIds));
    members.forEach((m) => userIdSet.add(m.userId));
  }

  if (filter.userIds?.length) {
    filter.userIds.forEach((id) => userIdSet.add(id));
  }

  if (filter.challengeId) {
    const apps = await db
      .select({ leaderId: teams.leaderId })
      .from(teamChallengeApplications)
      .innerJoin(teams, eq(teams.id, teamChallengeApplications.teamId))
      .where(
        and(
          eq(teamChallengeApplications.challengeId, filter.challengeId),
          eq(teamChallengeApplications.status, "accepted"),
        ),
      );
    apps.forEach((a) => userIdSet.add(a.leaderId));

    const members = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .innerJoin(
        teamChallengeApplications,
        and(
          eq(teamChallengeApplications.teamId, teams.id),
          eq(teamChallengeApplications.challengeId, filter.challengeId),
          eq(teamChallengeApplications.status, "accepted"),
        ),
      );
    members.forEach((m) => userIdSet.add(m.userId));
  }

  return Array.from(userIdSet);
}
