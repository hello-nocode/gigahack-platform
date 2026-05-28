"use server";

import { db } from "@db/index";
import { eventRegistrations, events, users, eventRoles } from "@db/schema";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { verifyAndClaimTicket } from "@/lib/actions/tickets";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

const registerSchema = z.object({
  ticketNumber: z.string().min(1, "Ticket number is required").max(100),
  motivation: z.string().max(1000).optional().or(z.literal("")),
  skills: z.string().max(500).optional().or(z.literal("")),
  experience: z.string().max(500).optional().or(z.literal("")),
});

export type RegistrationState =
  | { success: true; error?: never }
  | { success?: never; error: string };

// ── Register for event ────────────────────────────────────────────────────────

export async function registerForEvent(
  eventId: string,
  _prev: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const userId = await requireUser();

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return { error: "Event not found" };
  if (event.status === "completed") return { error: "This event is completed and can no longer be modified" };
  if (!event.registrationOpen) return { error: "Registration is not open for this event" };

  const [existing] = await db
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)));

  if (existing && existing.status === "approved") return { error: "You are already registered" };
  if (existing && existing.status === "rejected") return { error: "Your registration was rejected" };

  const raw = Object.fromEntries(formData);
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(", ") };

  // Verify and claim the ticket — auto-approves on success
  const ticketResult = await verifyAndClaimTicket(eventId, parsed.data.ticketNumber, userId);
  if (ticketResult.error) return { error: ticketResult.error };

  // Grant participant role
  const [existingRole] = await db
    .select()
    .from(eventRoles)
    .where(and(eq(eventRoles.userId, userId), eq(eventRoles.eventId, eventId), eq(eventRoles.role, "participant")));
  if (!existingRole) {
    await db.insert(eventRoles).values({ userId, eventId, role: "participant" });
  }

  if (existing && existing.status === "withdrawn") {
    await db
      .update(eventRegistrations)
      .set({
        status: "approved",
        ticketNumber: parsed.data.ticketNumber,
        motivation: parsed.data.motivation || null,
        skills: parsed.data.skills || null,
        experience: parsed.data.experience || null,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(eventRegistrations.id, existing.id));
  } else {
    await db.insert(eventRegistrations).values({
      eventId,
      userId,
      status: "approved",
      ticketNumber: parsed.data.ticketNumber,
      motivation: parsed.data.motivation || null,
      skills: parsed.data.skills || null,
      experience: parsed.data.experience || null,
      reviewedAt: new Date(),
    });
  }

  revalidatePath(`/events/${event.slug}`);
  return { success: true };
}

// ── Withdraw registration ─────────────────────────────────────────────────────

export async function withdrawRegistration(eventId: string): Promise<RegistrationState> {
  const userId = await requireUser();

  const [reg] = await db
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)));

  if (!reg) return { error: "Registration not found" };
  if (reg.status === "withdrawn") return { error: "Already withdrawn" };

  await db
    .update(eventRegistrations)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(eq(eventRegistrations.id, reg.id));

  const [event] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, eventId));
  revalidatePath(`/events/${event?.slug}`);
  return { success: true };
}

// ── Review registration (admin) ───────────────────────────────────────────────

export async function reviewRegistration(
  registrationId: string,
  decision: "approved" | "rejected",
): Promise<RegistrationState> {
  const userId = await requireUser();
  const admin = await isAdmin(userId);
  if (!admin) return { error: "Not authorised" };

  const [reg] = await db
    .select()
    .from(eventRegistrations)
    .where(eq(eventRegistrations.id, registrationId));
  if (!reg) return { error: "Registration not found" };
  if (reg.status !== "pending") return { error: "Can only review pending registrations" };

  await db
    .update(eventRegistrations)
    .set({ status: decision, reviewedBy: userId, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(eventRegistrations.id, registrationId));

  // On approval: add participant role in event_roles
  if (decision === "approved") {
    const [existing] = await db
      .select()
      .from(eventRoles)
      .where(
        and(
          eq(eventRoles.userId, reg.userId),
          eq(eventRoles.eventId, reg.eventId),
          eq(eventRoles.role, "participant"),
        ),
      );
    if (!existing) {
      await db.insert(eventRoles).values({
        userId: reg.userId,
        eventId: reg.eventId,
        role: "participant",
      });
    }
  }

  revalidatePath(`/events`);
  return { success: true };
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getMyRegistration(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [reg] = await db
    .select()
    .from(eventRegistrations)
    .where(
      and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, session.user.id)),
    );
  return reg ?? null;
}

export async function getRegistrationsForEvent(eventId: string) {
  return db
    .select({
      id: eventRegistrations.id,
      userId: eventRegistrations.userId,
      status: eventRegistrations.status,
      ticketNumber: eventRegistrations.ticketNumber,
      motivation: eventRegistrations.motivation,
      skills: eventRegistrations.skills,
      experience: eventRegistrations.experience,
      createdAt: eventRegistrations.createdAt,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      image: users.image,
      avatarUrl: users.avatarUrl,
    })
    .from(eventRegistrations)
    .innerJoin(users, eq(users.id, eventRegistrations.userId))
    .where(eq(eventRegistrations.eventId, eventId))
    .orderBy(eventRegistrations.createdAt);
}

export async function toggleRegistrationOpen(
  eventId: string,
  open: boolean,
): Promise<RegistrationState> {
  const userId = await requireUser();
  const admin = await isAdmin(userId);
  if (!admin) return { error: "Not authorised" };

  await db
    .update(events)
    .set({ registrationOpen: open, updatedAt: new Date() })
    .where(eq(events.id, eventId));

  revalidatePath(`/events`);
  return { success: true };
}
