"use server";

import { revalidatePath } from "next/cache";
import { db } from "@db/index";
import { eventScheduleItems, events } from "@db/schema";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getScheduleForEvent(eventId: string) {
  return db
    .select()
    .from(eventScheduleItems)
    .where(eq(eventScheduleItems.eventId, eventId))
    .orderBy(asc(eventScheduleItems.startsAt), asc(eventScheduleItems.sortOrder));
}

export async function getUpcomingScheduleItems(eventId: string, limit = 3) {
  const now = new Date();
  const all = await db
    .select()
    .from(eventScheduleItems)
    .where(eq(eventScheduleItems.eventId, eventId))
    .orderBy(asc(eventScheduleItems.startsAt));
  const upcoming = all.filter((item) => item.startsAt >= now);
  return upcoming.slice(0, limit);
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createScheduleItem(
  eventId: string,
  data: {
    title: string;
    type: "keynote" | "workshop" | "meal" | "deadline" | "other";
    startsAt: Date;
    endsAt?: Date | null;
    location?: string | null;
    description?: string | null;
    sortOrder?: number;
  },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const admin = await isAdmin(session.user.id);
  if (!admin) throw new Error("Forbidden");

  const event = await db.select({ slug: events.slug }).from(events).where(eq(events.id, eventId)).then((r) => r[0]);
  if (!event) throw new Error("Event not found");

  await db.insert(eventScheduleItems).values({
    eventId,
    title: data.title,
    type: data.type,
    startsAt: data.startsAt,
    endsAt: data.endsAt ?? null,
    location: data.location ?? null,
    description: data.description ?? null,
    sortOrder: data.sortOrder ?? 0,
  });

  revalidatePath(`/admin/events/${eventId}/schedule`);
  revalidatePath(`/events/${event.slug}/schedule`);
  revalidatePath(`/dashboard`);
}

export async function updateScheduleItem(
  itemId: string,
  data: {
    title?: string;
    type?: "keynote" | "workshop" | "meal" | "deadline" | "other";
    startsAt?: Date;
    endsAt?: Date | null;
    location?: string | null;
    description?: string | null;
    sortOrder?: number;
  },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const admin = await isAdmin(session.user.id);
  if (!admin) throw new Error("Forbidden");

  const existing = await db
    .select({ eventId: eventScheduleItems.eventId })
    .from(eventScheduleItems)
    .where(eq(eventScheduleItems.id, itemId))
    .then((r) => r[0]);

  if (!existing) throw new Error("Schedule item not found");

  await db
    .update(eventScheduleItems)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(eventScheduleItems.id, itemId));

  const event = await db.select({ slug: events.slug }).from(events).where(eq(events.id, existing.eventId)).then((r) => r[0]);

  revalidatePath(`/admin/events/${existing.eventId}/schedule`);
  if (event) revalidatePath(`/events/${event.slug}/schedule`);
  revalidatePath(`/dashboard`);
}

export async function deleteScheduleItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const admin = await isAdmin(session.user.id);
  if (!admin) throw new Error("Forbidden");

  const item = await db
    .select({ eventId: eventScheduleItems.eventId })
    .from(eventScheduleItems)
    .where(eq(eventScheduleItems.id, itemId))
    .then((r) => r[0]);

  if (!item) return;

  const event = await db.select({ slug: events.slug }).from(events).where(eq(events.id, item.eventId)).then((r) => r[0]);

  await db.delete(eventScheduleItems).where(eq(eventScheduleItems.id, itemId));

  revalidatePath(`/admin/events/${item.eventId}/schedule`);
  if (event) revalidatePath(`/events/${event.slug}/schedule`);
  revalidatePath(`/dashboard`);
}
