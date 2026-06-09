"use server";

import { db } from "@db/index";
import {
  mentorInvites,
  mentorProfiles,
  mentorSlots,
  mentorBookings,
  eventRoles,
  events,
  teams,
  teamMembers,
  users,
  partnerProfiles,
  eventRegistrations,
} from "@db/schema";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { eq, and, gte, lt, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { createNotification, sendNotificationEmail, getOrCreatePreferences } from "@/lib/actions/notifications";
import { inngest } from "@/lib/inngest/client";
import { z } from "zod";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const admin = await isAdmin(session.user.id);
  if (!admin) redirect("/dashboard");
  return session.user.id;
}

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

// ── Invite generation ────────────────────────────────────────────────────────

export async function generateMentorInvite(eventId: string) {
  await requireAdmin();
  const session = await auth();
  const code = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(mentorInvites).values({
    eventId,
    code,
    createdBy: session!.user!.id!,
    expiresAt,
  });
  revalidatePath(`/admin/events/${eventId}/mentor-invites`);
  return code;
}

export async function getMentorInvitesForEvent(eventId: string) {
  return db
    .select({
      id: mentorInvites.id,
      code: mentorInvites.code,
      usedAt: mentorInvites.usedAt,
      expiresAt: mentorInvites.expiresAt,
      createdAt: mentorInvites.createdAt,
    })
    .from(mentorInvites)
    .where(eq(mentorInvites.eventId, eventId))
    .orderBy(mentorInvites.createdAt);
}

// ── Invite acceptance ─────────────────────────────────────────────────────────

export type AcceptMentorInviteState =
  | { success: true; mentorId: string; eventSlug: string; error?: never }
  | { success?: never; error: string };

export async function acceptMentorInvite(
  code: string,
): Promise<AcceptMentorInviteState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in" };
  const userId = session.user.id;

  const [invite] = await db
    .select()
    .from(mentorInvites)
    .where(eq(mentorInvites.code, code));

  if (!invite) return { error: "Invalid invite link" };
  if (invite.usedBy) return { error: "This invite has already been used" };
  if (invite.expiresAt && invite.expiresAt < new Date())
    return { error: "This invite has expired" };

  const [existing] = await db
    .select()
    .from(mentorProfiles)
    .where(
      and(
        eq(mentorProfiles.userId, userId),
        eq(mentorProfiles.eventId, invite.eventId),
      ),
    );
  if (existing)
    return { error: "You are already a mentor for this event", mentorId: existing.id, eventSlug: "" } as AcceptMentorInviteState;

  const dbUser = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, userId))
    .then((r) => r[0]);

  const [profile] = await db
    .insert(mentorProfiles)
    .values({
      userId,
      eventId: invite.eventId,
      firstName: dbUser?.firstName ?? "",
      lastName: dbUser?.lastName ?? "",
    })
    .returning();

  await db.insert(eventRoles).values({
    userId,
    eventId: invite.eventId,
    role: "mentor",
  }).onConflictDoNothing();

  await db
    .update(mentorInvites)
    .set({ usedBy: userId, usedAt: new Date() })
    .where(eq(mentorInvites.id, invite.id));

  const [event] = await db
    .select({ slug: events.slug })
    .from(events)
    .where(eq(events.id, invite.eventId));

  return { success: true, mentorId: profile!.id, eventSlug: event!.slug };
}

// ── Mentor profile ────────────────────────────────────────────────────────────

const mentorProfileSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  bio: z.string().max(2000).optional().or(z.literal("")),
  expertise: z.string().max(500).optional().or(z.literal("")),
  company: z.string().max(100).optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export type MentorProfileFormState =
  | { success: true; error?: never }
  | { success?: never; error: string };

export async function upsertMentorProfile(
  profileId: string,
  _prev: MentorProfileFormState,
  formData: FormData,
): Promise<MentorProfileFormState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile] = await db
    .select()
    .from(mentorProfiles)
    .where(eq(mentorProfiles.id, profileId));
  if (!profile) return { error: "Profile not found" };

  const admin = await isAdmin(session.user.id);
  if (profile.userId !== session.user.id && !admin)
    return { error: "Not authorised" };

  const raw = Object.fromEntries(formData);
  const parsed = mentorProfileSchema.safeParse(raw);
  if (!parsed.success)
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };

  await db
    .update(mentorProfiles)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(mentorProfiles.id, profileId));

  revalidatePath(`/events`);
  return { success: true };
}

export async function getMentorsForEvent(eventId: string) {
  const profiles = await db
    .select()
    .from(mentorProfiles)
    .where(eq(mentorProfiles.eventId, eventId));

  const withCounts = await Promise.all(
    profiles.map(async (p) => {
      const allSlots = await db
        .select({ id: mentorSlots.id })
        .from(mentorSlots)
        .where(eq(mentorSlots.mentorProfileId, p.id));

      const bookedSlotIds = await db
        .select({ slotId: mentorBookings.slotId })
        .from(mentorBookings)
        .innerJoin(mentorSlots, eq(mentorBookings.slotId, mentorSlots.id))
        .where(
          and(
            eq(mentorSlots.mentorProfileId, p.id),
            isNull(mentorBookings.cancelledAt),
          ),
        )
        .then((r) => new Set(r.map((b) => b.slotId)));

      const availableSlots = allSlots.filter((s) => !bookedSlotIds.has(s.id)).length;
      return { ...p, availableSlots };
    }),
  );
  return withCounts;
}

export async function getMentorProfile(profileId: string) {
  const [profile] = await db
    .select()
    .from(mentorProfiles)
    .where(eq(mentorProfiles.id, profileId));
  return profile ?? null;
}

export async function getMentorProfileForUser(userId: string, eventId: string) {
  const [profile] = await db
    .select()
    .from(mentorProfiles)
    .where(
      and(
        eq(mentorProfiles.userId, userId),
        eq(mentorProfiles.eventId, eventId),
      ),
    );
  return profile ?? null;
}

// ── Slots ─────────────────────────────────────────────────────────────────────

export type GenerateSlotsState =
  | { success: true; count: number; error?: never }
  | { success?: never; error: string };

export async function generateMentorSlots(
  mentorProfileId: string,
  _prev: GenerateSlotsState,
  formData: FormData,
): Promise<GenerateSlotsState> {
  const userId = await requireSession();

  const [profile] = await db
    .select()
    .from(mentorProfiles)
    .where(eq(mentorProfiles.id, mentorProfileId));
  if (!profile) return { error: "Profile not found" };

  const admin = await isAdmin(userId);
  if (profile.userId !== userId && !admin) return { error: "Not authorised" };

  const date = formData.get("date") as string;
  const startHour = parseInt(formData.get("startHour") as string);
  const endHour = parseInt(formData.get("endHour") as string);

  if (!date || isNaN(startHour) || isNaN(endHour))
    return { error: "Date, start hour and end hour are required" };
  if (startHour >= endHour)
    return { error: "Start hour must be before end hour" };

  const [event] = await db
    .select({ mentorSlotDuration: events.mentorSlotDuration })
    .from(events)
    .where(eq(events.id, profile.eventId));
  const duration = event?.mentorSlotDuration ?? 30;

  const slots: { mentorProfileId: string; eventId: string; startsAt: Date; endsAt: Date }[] = [];
  let cursor = new Date(`${date}T${String(startHour).padStart(2, "0")}:00:00`);
  const end = new Date(`${date}T${String(endHour).padStart(2, "0")}:00:00`);

  while (cursor < end) {
    const slotEnd = new Date(cursor.getTime() + duration * 60 * 1000);
    if (slotEnd > end) break;
    slots.push({
      mentorProfileId,
      eventId: profile.eventId,
      startsAt: new Date(cursor),
      endsAt: slotEnd,
    });
    cursor = slotEnd;
  }

  if (slots.length === 0) return { error: "No slots could be generated for this range" };

  await db.insert(mentorSlots).values(slots);
  revalidatePath(`/events`);
  return { success: true, count: slots.length };
}

export async function deleteMentorSlot(slotId: string) {
  const userId = await requireSession();

  const [slot] = await db
    .select()
    .from(mentorSlots)
    .where(eq(mentorSlots.id, slotId));
  if (!slot) return { error: "Slot not found" };

  const [profile] = await db
    .select()
    .from(mentorProfiles)
    .where(eq(mentorProfiles.id, slot.mentorProfileId));

  const admin = await isAdmin(userId);
  if (profile?.userId !== userId && !admin) return { error: "Not authorised" };

  const [booking] = await db
    .select()
    .from(mentorBookings)
    .where(and(eq(mentorBookings.slotId, slotId), isNull(mentorBookings.cancelledAt)));
  if (booking) return { error: "Cannot delete a booked slot" };

  await db.delete(mentorSlots).where(eq(mentorSlots.id, slotId));
  revalidatePath(`/events`);
  return { success: true };
}

export async function getSlotsByMentor(mentorProfileId: string) {
  const slots = await db
    .select()
    .from(mentorSlots)
    .where(eq(mentorSlots.mentorProfileId, mentorProfileId))
    .orderBy(mentorSlots.startsAt);

  const bookingMap = new Map(
    (
      await db
        .select()
        .from(mentorBookings)
        .innerJoin(mentorSlots, eq(mentorBookings.slotId, mentorSlots.id))
        .where(
          and(
            eq(mentorSlots.mentorProfileId, mentorProfileId),
            isNull(mentorBookings.cancelledAt),
          ),
        )
    ).map((r) => [r.mentor_bookings.slotId, r.mentor_bookings]),
  );

  return slots.map((s) => ({
    ...s,
    booking: bookingMap.get(s.id) ?? null,
  }));
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export type BookSlotState =
  | { success: true; error?: never }
  | { success?: never; error: string };

export async function bookSlot(
  slotId: string,
  teamId: string,
): Promise<BookSlotState> {
  const userId = await requireSession();

  // Fetch the slot first to get eventId
  const [slot] = await db
    .select()
    .from(mentorSlots)
    .where(eq(mentorSlots.id, slotId));
  if (!slot) return { error: "Slot not found" };

  // Block non-participants: admins, partners, mentors
  const [adminCheck, partnerCheck, mentorCheck] = await Promise.all([
    isAdmin(userId),
    db.select({ id: partnerProfiles.id })
      .from(partnerProfiles)
      .where(and(eq(partnerProfiles.userId, userId), eq(partnerProfiles.eventId, slot.eventId)))
      .then(r => r.length > 0),
    db.select({ id: mentorProfiles.id })
      .from(mentorProfiles)
      .where(and(eq(mentorProfiles.userId, userId), eq(mentorProfiles.eventId, slot.eventId)))
      .then(r => r.length > 0),
  ]);

  if (adminCheck) return { error: "Admins cannot book mentor sessions" };
  if (partnerCheck) return { error: "Partners cannot book mentor sessions" };
  if (mentorCheck) return { error: "Mentors cannot book their own or others\' sessions" };

  // Require approved registration for this event
  const [registration] = await db
    .select({ id: eventRegistrations.id })
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.userId, userId),
        eq(eventRegistrations.eventId, slot.eventId),
        eq(eventRegistrations.status, "approved"),
      ),
    );
  if (!registration) return { error: "Only approved participants can book mentor sessions" };

  // Check user is team leader
  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
    );
  if (!membership) return { error: "You are not a member of this team" };

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (team?.leaderId !== userId) return { error: "Only the team leader can book sessions" };

  if (slot.startsAt < new Date()) return { error: "This slot is in the past" };

  // Check slot not already booked
  const [existingBooking] = await db
    .select()
    .from(mentorBookings)
    .where(
      and(eq(mentorBookings.slotId, slotId), isNull(mentorBookings.cancelledAt)),
    );
  if (existingBooking) return { error: "This slot is already booked" };

  // Check: team ≤1 booking per day per mentor
  const slotDate = slot.startsAt.toISOString().slice(0, 10);
  const dayStart = new Date(`${slotDate}T00:00:00`);
  const dayEnd = new Date(`${slotDate}T23:59:59`);

  const sameDayBookings = await db
    .select({ id: mentorBookings.id })
    .from(mentorBookings)
    .innerJoin(mentorSlots, eq(mentorBookings.slotId, mentorSlots.id))
    .where(
      and(
        eq(mentorBookings.teamId, teamId),
        eq(mentorSlots.mentorProfileId, slot.mentorProfileId),
        isNull(mentorBookings.cancelledAt),
        gte(mentorSlots.startsAt, dayStart),
        lt(mentorSlots.startsAt, dayEnd),
      ),
    );
  if (sameDayBookings.length > 0)
    return { error: "Your team already has a session with this mentor on this day" };

  const [booking] = await db.insert(mentorBookings).values({
    slotId,
    teamId,
    bookedBy: userId,
  }).returning();

  // Fetch mentor profile to get mentor userId and event slug
  const [mentorProfile] = await db
    .select({ userId: mentorProfiles.userId, eventId: mentorProfiles.eventId })
    .from(mentorProfiles)
    .where(eq(mentorProfiles.id, slot.mentorProfileId));

  const [teamRow] = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, teamId));

  if (mentorProfile) {
    const slotTime = new Date(slot.startsAt).toLocaleString("en-GB", {
      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
    const title = "New mentoring session booked";
    const body = `${teamRow?.name ?? "A team"} booked a session with you on ${slotTime}.`;
    const link = `/events/[slug]/mentors/${slot.mentorProfileId}/schedule`;

    await createNotification({
      userId: mentorProfile.userId,
      eventId: mentorProfile.eventId,
      type: "mentor_booked",
      title,
      body,
    });

    const prefs = await getOrCreatePreferences(mentorProfile.userId);
    if (prefs?.emailOnMentorBooked) {
      void sendNotificationEmail(mentorProfile.userId, title, body, link);
    }

    // Schedule 15-min reminder via Inngest
    const reminderAt = new Date(slot.startsAt.getTime() - 15 * 60 * 1000);
    if (booking && reminderAt > new Date()) {
      try {
        await inngest.send({
          name: "mentor.slot.booked",
          data: {
            bookingId: booking.id,
            slotId,
            teamId,
            mentorUserId: mentorProfile.userId,
            eventId: mentorProfile.eventId,
            startsAt: slot.startsAt.toISOString(),
          },
          ts: reminderAt.getTime(),
        });
      } catch (err) {
        console.warn("[inngest] Could not schedule session reminder (key not configured?):", err);
      }
    }
  }

  revalidatePath(`/events`);
  return { success: true };
}

export async function cancelBooking(bookingId: string): Promise<BookSlotState> {
  const userId = await requireSession();

  const [booking] = await db
    .select()
    .from(mentorBookings)
    .where(eq(mentorBookings.id, bookingId));
  if (!booking) return { error: "Booking not found" };
  if (booking.cancelledAt) return { error: "Already cancelled" };

  // Check user is team leader
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, booking.teamId));
  if (team?.leaderId !== userId) return { error: "Only the team leader can cancel" };

  // Enforce 15-min cancellation window
  const [slot] = await db
    .select()
    .from(mentorSlots)
    .where(eq(mentorSlots.id, booking.slotId));
  const cutoff = new Date(slot!.startsAt.getTime() - 15 * 60 * 1000);
  if (new Date() > cutoff)
    return { error: "Cannot cancel less than 15 minutes before the session" };

  await db
    .update(mentorBookings)
    .set({ cancelledAt: new Date() })
    .where(eq(mentorBookings.id, bookingId));

  revalidatePath(`/events`);
  return { success: true };
}

export async function getBookingsForMentor(mentorProfileId: string) {
  return db
    .select({
      booking: mentorBookings,
      slot: mentorSlots,
      team: {
        id: teams.id,
        name: teams.name,
        description: teams.description,
        status: teams.status,
      },
    })
    .from(mentorBookings)
    .innerJoin(mentorSlots, eq(mentorBookings.slotId, mentorSlots.id))
    .innerJoin(teams, eq(mentorBookings.teamId, teams.id))
    .where(
      and(
        eq(mentorSlots.mentorProfileId, mentorProfileId),
        isNull(mentorBookings.cancelledAt),
      ),
    )
    .orderBy(mentorSlots.startsAt);
}

export async function getBookingsForTeam(teamId: string) {
  return db
    .select({
      booking: mentorBookings,
      slot: mentorSlots,
      mentor: mentorProfiles,
    })
    .from(mentorBookings)
    .innerJoin(mentorSlots, eq(mentorBookings.slotId, mentorSlots.id))
    .innerJoin(mentorProfiles, eq(mentorSlots.mentorProfileId, mentorProfiles.id))
    .where(
      and(eq(mentorBookings.teamId, teamId), isNull(mentorBookings.cancelledAt)),
    )
    .orderBy(mentorSlots.startsAt);
}
