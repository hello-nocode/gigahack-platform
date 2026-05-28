import { inngest } from "./client";
import { db } from "@db/index";
import { events, auditLog } from "@db/schema";
import { eq } from "drizzle-orm";

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

// Export all functions
export const functions = [
  registrationOpened,
  registrationClosed,
  eventLiveStarted,
  judgingStarted,
  eventClosed,
];
