import { inngest } from "./client";
import { db } from "@db/index";
import { events, auditLog, teamMembers, scheduledBroadcasts } from "@db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createNotification, sendNotificationEmail, getOrCreatePreferences, resolveBroadcastRecipients } from "@/lib/actions/notifications";

// Event type definitions
interface EventStatusPayload {
  eventId: string;
  previousStatus: string;
  newStatus: string;
  triggeredBy: string;
}

// Log status change to audit trail
async function logStatusChange(
  eventId: string,
  previousStatus: string,
  newStatus: string,
  triggeredBy: string
) {
  await db.insert(auditLog).values({
    eventId,
    actorId: triggeredBy,
    action: "event.status.change",
    entityType: "event",
    entityId: eventId,
    beforeState: { status: previousStatus },
    afterState: { status: newStatus },
  });
}

// Registration opened
export const registrationOpened = inngest.createFunction(
  { id: "event-registration-opened" },
  { event: "event.status.registration_open" },
  async ({ event }) => {
    const { eventId, previousStatus, triggeredBy } = event.data as EventStatusPayload;
    
    // Update event: enable registration
    await db
      .update(events)
      .set({ 
        registrationOpen: true,
        partnerApplicationsOpen: true 
      })
      .where(eq(events.id, eventId));
    
    await logStatusChange(eventId, previousStatus, "registration_open", triggeredBy);
    
    return { success: true, message: "Registration opened for event" };
  }
);

// Registration closed
export const registrationClosed = inngest.createFunction(
  { id: "event-registration-closed" },
  { event: "event.status.applications_open" },
  async ({ event }) => {
    const { eventId, previousStatus, triggeredBy } = event.data as EventStatusPayload;
    
    // Update event: disable registration, freeze teams
    await db
      .update(events)
      .set({ 
        registrationOpen: false,
        partnerApplicationsOpen: false 
      })
      .where(eq(events.id, eventId));
    
    await logStatusChange(eventId, previousStatus, "applications_open", triggeredBy);
    
    return { success: true, message: "Applications opened, registration closed" };
  }
);

// Event goes live (hacking starts)
export const eventLiveStarted = inngest.createFunction(
  { id: "event-live-started" },
  { event: "event.status.in_progress" },
  async ({ event }) => {
    const { eventId, previousStatus, triggeredBy } = event.data as EventStatusPayload;
    
    await logStatusChange(eventId, previousStatus, "in_progress", triggeredBy);
    
    return { success: true, message: "Event is now in progress, hacking started" };
  }
);

// Judging phase started
export const judgingStarted = inngest.createFunction(
  { id: "event-judging-started" },
  { event: "event.status.judging" },
  async ({ event }) => {
    const { eventId, previousStatus, triggeredBy } = event.data as EventStatusPayload;
    
    await logStatusChange(eventId, previousStatus, "judging", triggeredBy);
    
    return { success: true, message: "Judging phase started" };
  }
);

// Event closed
export const eventClosed = inngest.createFunction(
  { id: "event-closed" },
  { event: "event.status.completed" },
  async ({ event }) => {
    const { eventId, previousStatus, triggeredBy } = event.data as EventStatusPayload;
    
    await logStatusChange(eventId, previousStatus, "completed", triggeredBy);
    
    return { success: true, message: "Event completed, rankings published" };
  }
);

// ── Session reminder (fires 15 min before slot) ───────────────────────────────

interface SlotBookedPayload {
  bookingId: string;
  slotId: string;
  teamId: string;
  mentorUserId: string;
  eventId: string;
  startsAt: string;
}

export const sessionReminder = inngest.createFunction(
  { id: "session-reminder" },
  { event: "mentor.slot.booked" },
  async ({ event }) => {
    const { teamId, mentorUserId, eventId, startsAt } = event.data as SlotBookedPayload;

    const slotDate = new Date(startsAt);
    const timeStr = slotDate.toLocaleString("en-GB", {
      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });

    const title = "Mentoring session starting soon";
    const body = `Your mentoring session starts in 15 minutes (${timeStr}).`;

    // Notify all team members
    const members = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    for (const member of members) {
      await createNotification({ userId: member.userId, eventId, type: "session_reminder", title, body });
      const prefs = await getOrCreatePreferences(member.userId);
      if (prefs?.emailOnSessionReminder) void sendNotificationEmail(member.userId, title, body);
    }

    // Notify mentor
    await createNotification({ userId: mentorUserId, eventId, type: "session_reminder", title, body });
    const mentorPrefs = await getOrCreatePreferences(mentorUserId);
    if (mentorPrefs?.emailOnSessionReminder) void sendNotificationEmail(mentorUserId, title, body);

    return { success: true, notified: members.length + 1 };
  },
);

// ── Admin scheduled broadcast ─────────────────────────────────────────────────

interface BroadcastPayload {
  broadcastId: string;
}

export const sendScheduledBroadcast = inngest.createFunction(
  { id: "send-scheduled-broadcast" },
  { event: "admin.broadcast.scheduled" },
  async ({ event }) => {
    const { broadcastId } = event.data as BroadcastPayload;

    const broadcastRows = await db
      .select()
      .from(scheduledBroadcasts)
      .where(and(eq(scheduledBroadcasts.id, broadcastId), isNull(scheduledBroadcasts.sentAt)));
    const broadcast = broadcastRows[0];
    if (!broadcast) return { skipped: true };

    const recipientIds = await resolveBroadcastRecipients(broadcastId);

    for (const userId of recipientIds) {
      await createNotification({
        userId,
        eventId: broadcast.eventId ?? undefined,
        type: "admin_broadcast",
        title: broadcast.title,
        body: broadcast.body,
        link: broadcast.link ?? undefined,
      });
      const prefs = await getOrCreatePreferences(userId);
      if (prefs?.emailOnAdminBroadcast) {
        void sendNotificationEmail(userId, broadcast.title, broadcast.body, broadcast.link);
      }
    }

    await db
      .update(scheduledBroadcasts)
      .set({ sentAt: new Date(), recipientCount: recipientIds.length })
      .where(eq(scheduledBroadcasts.id, broadcastId));

    return { success: true, recipientCount: recipientIds.length };
  },
);

// Export all functions
export const functions = [
  registrationOpened,
  registrationClosed,
  eventLiveStarted,
  judgingStarted,
  eventClosed,
  sessionReminder,
  sendScheduledBroadcast,
];
