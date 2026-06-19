"use server";

import { db } from "@db/index";
import { events, eventRoles } from "@db/schema";
import type { NewEvent } from "@db/schema";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { eq, inArray, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

type EventStatus = "draft" | "registration_open" | "applications_open" | "in_progress" | "judging" | "completed";

const eventSchema = z.object({
  title: z.string().min(3).max(100),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),
  year: z.coerce.number().int().min(2020).max(2100),
  status: z.enum(["draft", "registration_open", "applications_open", "in_progress", "judging", "completed"]),
  minTeamSize: z.coerce.number().int().min(1).max(10),
  maxTeamSize: z.coerce.number().int().min(1).max(20),
  maxChallengeApplications: z.coerce.number().int().min(1).max(10),
  mentorSlotDuration: z.coerce.number().int().min(5).max(120).default(30),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  timezone: z.string().default("Europe/Chisinau"),
  partnerApplicationsOpen: z.coerce.boolean().default(false),
  registrationOpen: z.coerce.boolean().default(false),
  description: z.string().max(5000).optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
  customSections: z.string().optional(),
});

export type EventFormState =
  | { success: true; slug: string; error?: never }
  | { success?: never; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const admin = await isAdmin(session.user.id);
  if (!admin) redirect("/dashboard");
  return session.user.id;
}

export async function createEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const userId = await requireAdmin();

  const raw = Object.fromEntries(formData);
  const parsed = eventSchema.safeParse({
    ...raw,
    partnerApplicationsOpen: raw["partnerApplicationsOpen"] === "on",
    registrationOpen: raw["registrationOpen"] === "on",
  });

  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: msg };
  }

  const { startsAt, endsAt, customSections, coverImageUrl, description, location, ...rest } = parsed.data;

  let parsedSections: { title: string; body: string }[] | undefined;
  try { parsedSections = customSections ? JSON.parse(customSections) : undefined; } catch { parsedSections = undefined; }

  try {
    const newEvent: NewEvent = {
      ...rest,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      description: description || null,
      coverImageUrl: coverImageUrl || null,
      location: location || null,
      customSections: parsedSections ?? null,
    };

    const [created] = await db.insert(events).values(newEvent).returning();

    await db.insert(eventRoles).values({
      userId,
      eventId: created!.id,
      role: "admin",
    });

    revalidatePath("/events");
    return { success: true, slug: created!.slug };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("unique")) return { error: "Slug or year already exists" };
    return { error: msg };
  }
}

export async function updateEvent(
  eventId: string,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireAdmin();

  const raw = Object.fromEntries(formData);
  const parsed = eventSchema.safeParse({
    ...raw,
    partnerApplicationsOpen: raw["partnerApplicationsOpen"] === "on",
    registrationOpen: raw["registrationOpen"] === "on",
  });

  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: msg };
  }

  const { startsAt, endsAt, customSections, coverImageUrl, description, location, ...rest } = parsed.data;

  let parsedSections: { title: string; body: string }[] | undefined;
  try { parsedSections = customSections ? JSON.parse(customSections) : undefined; } catch { parsedSections = undefined; }

  try {
    await db
      .update(events)
      .set({
        ...rest,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        description: description || null,
        coverImageUrl: coverImageUrl || null,
        location: location || null,
        customSections: parsedSections ?? null,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));

    revalidatePath("/events");
    revalidatePath(`/events/${rest.slug}`);
    return { success: true, slug: rest.slug };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("unique")) return { error: "Slug or year already exists" };
    return { error: msg };
  }
}

export async function deleteEvent(eventId: string) {
  await requireAdmin();
  await db.delete(events).where(eq(events.id, eventId));
  revalidatePath("/events");
  redirect("/events");
}

export async function getEvents() {
  return db.select().from(events).orderBy(events.year);
}

// Statuses that mean an event is "live" for the participant workflow.
const ACTIVE_EVENT_STATUSES = [
  "registration_open",
  "applications_open",
  "in_progress",
  "judging",
] as const;

/**
 * Returns the single active event for the participant workflow, or null.
 * The platform only ever has one event live at a time; if multiple match
 * (edge case), the most recent year wins.
 */
export async function getActiveEvent() {
  const [active] = await db
    .select()
    .from(events)
    .where(inArray(events.status, [...ACTIVE_EVENT_STATUSES]))
    .orderBy(desc(events.year))
    .limit(1);
  return active ?? null;
}

export async function getEventBySlug(slug: string) {
  const [event] = await db.select().from(events).where(eq(events.slug, slug));
  return event ?? null;
}

export async function getEventById(id: string) {
  const [event] = await db.select().from(events).where(eq(events.id, id));
  return event ?? null;
}

// Valid status transitions
const validTransitions: Record<string, string[]> = {
  draft: ["registration_open"],
  registration_open: ["applications_open", "draft"],
  applications_open: ["in_progress", "registration_open"],
  in_progress: ["judging", "applications_open"],
  judging: ["completed", "in_progress"],
  completed: ["judging"],
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  registration_open: "Registration Open",
  applications_open: "Applications Open",
  in_progress: "In Progress",
  judging: "Judging",
  completed: "Completed",
};

export type EventStatusUpdateResult =
  | { success: true; error?: never }
  | { success?: never; error: string };

export async function updateEventStatus(
  eventId: string,
  newStatus: string
): Promise<EventStatusUpdateResult> {
  const userId = await requireAdmin();

  // Get current event
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return { error: "Event not found" };

  const currentStatus = event.status;

  // Validate transition
  const allowedTransitions = validTransitions[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus)) {
    return {
      error: `Invalid status transition from "${statusLabels[currentStatus]}" to "${statusLabels[newStatus]}". Allowed: ${allowedTransitions.map(s => statusLabels[s]).join(", ")}`,
    };
  }

  // Update event status
  await db
    .update(events)
    .set({ status: newStatus as EventStatus, updatedAt: new Date() })
    .where(eq(events.id, eventId));

  // Trigger Inngest event for side effects
  const { inngest } = await import("@/lib/inngest/client");
  await inngest.send({
    name: `event.status.${newStatus}`,
    data: {
      eventId,
      previousStatus: currentStatus,
      newStatus,
      triggeredBy: userId,
    },
  });

  revalidatePath(`/admin/events/${eventId}/status`);
  revalidatePath(`/events/${event.slug}`);

  return { success: true };
}

export async function getValidTransitions(status: string): Promise<string[]> {
  return validTransitions[status] || [];
}

export async function getStatusLabel(status: string): Promise<string> {
  return statusLabels[status] || status;
}

// ── Admin: Toggle Challenge Applications ──────────────────────────────────────

export type ToggleApplicationsResult =
  | { success: true; isOpen: boolean; error?: never }
  | { success?: never; error: string };

export async function toggleApplicationsOpen(eventId: string): Promise<ToggleApplicationsResult> {
  await requireAdmin();

  const [event] = await db
    .select({ id: events.id, applicationsOpen: events.applicationsOpen, slug: events.slug })
    .from(events)
    .where(eq(events.id, eventId));

  if (!event) return { error: "Event not found" };

  const newState = !event.applicationsOpen;

  await db
    .update(events)
    .set({ applicationsOpen: newState, updatedAt: new Date() })
    .where(eq(events.id, eventId));

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/events/${event.slug}`);
  revalidatePath(`/dashboard`);

  return { success: true, isOpen: newState };
}

export async function getApplicationsOpenStatus(eventId: string): Promise<boolean> {
  const [event] = await db
    .select({ applicationsOpen: events.applicationsOpen })
    .from(events)
    .where(eq(events.id, eventId));
  return event?.applicationsOpen ?? false;
}
