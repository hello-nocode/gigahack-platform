"use server";

import { db } from "@db/index";
import { partnerInvites, partnerProfiles, eventRoles, events } from "@db/schema";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { z } from "zod";

// ── Invite generation ────────────────────────────────────────────────────────

export async function generateInvite(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const admin = await isAdmin(session.user.id);
  if (!admin) redirect("/dashboard");

  const code = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(partnerInvites).values({
    eventId,
    code,
    createdBy: session.user.id,
    expiresAt,
  });

  revalidatePath(`/admin/events/${eventId}/invites`);
  return code;
}

export async function getInvitesForEvent(eventId: string) {
  return db
    .select({
      id: partnerInvites.id,
      code: partnerInvites.code,
      usedAt: partnerInvites.usedAt,
      expiresAt: partnerInvites.expiresAt,
      createdAt: partnerInvites.createdAt,
    })
    .from(partnerInvites)
    .where(eq(partnerInvites.eventId, eventId))
    .orderBy(partnerInvites.createdAt);
}

// ── Invite acceptance ────────────────────────────────────────────────────────

export type AcceptInviteState =
  | { success: true; eventSlug: string; error?: never }
  | { success?: never; error: string };

export async function acceptInvite(code: string): Promise<AcceptInviteState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in" };

  const [invite] = await db
    .select()
    .from(partnerInvites)
    .where(eq(partnerInvites.code, code));

  if (!invite) return { error: "Invalid invite link" };
  if (invite.usedBy) return { error: "This invite has already been used" };
  if (invite.expiresAt && invite.expiresAt < new Date())
    return { error: "This invite has expired" };

  const [existing] = await db
    .select()
    .from(partnerProfiles)
    .where(
      and(
        eq(partnerProfiles.userId, session.user.id),
        eq(partnerProfiles.eventId, invite.eventId),
      ),
    );
  if (existing) return { error: "You are already a partner for this event" };

  const userId = session.user.id;

  await db.insert(partnerProfiles).values({
    userId,
    eventId: invite.eventId,
    companyName: "My Company",
  });

  await db.insert(eventRoles).values({
    userId,
    eventId: invite.eventId,
    role: "partner_admin",
  });

  await db
    .update(partnerInvites)
    .set({ usedBy: userId, usedAt: new Date() })
    .where(eq(partnerInvites.id, invite.id));

  const [event] = await db
    .select({ slug: events.slug })
    .from(events)
    .where(eq(events.id, invite.eventId));

  return { success: true, eventSlug: event!.slug };
}

// ── Partner profile ──────────────────────────────────────────────────────────

const profileSchema = z.object({
  companyName: z.string().min(2).max(100),
  website: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().max(1000).optional(),
});

export type ProfileFormState =
  | { success: true; error?: never }
  | { success?: never; error: string };

export async function upsertPartnerProfile(
  partnerId: string,
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile] = await db
    .select()
    .from(partnerProfiles)
    .where(eq(partnerProfiles.id, partnerId));

  if (!profile) return { error: "Profile not found" };

  const admin = await isAdmin(session.user.id);
  if (profile.userId !== session.user.id && !admin)
    return { error: "Not authorised" };

  const raw = Object.fromEntries(formData);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  await db
    .update(partnerProfiles)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(partnerProfiles.id, partnerId));

  revalidatePath(`/events`);
  return { success: true };
}

export async function getPartnersForEvent(eventId: string) {
  return db
    .select()
    .from(partnerProfiles)
    .where(eq(partnerProfiles.eventId, eventId));
}

export async function getPartnerProfile(partnerId: string) {
  const [profile] = await db
    .select()
    .from(partnerProfiles)
    .where(eq(partnerProfiles.id, partnerId));
  return profile ?? null;
}

export async function getPartnerProfileForUser(userId: string, eventId: string) {
  const [profile] = await db
    .select()
    .from(partnerProfiles)
    .where(
      and(eq(partnerProfiles.userId, userId), eq(partnerProfiles.eventId, eventId)),
    );
  return profile ?? null;
}
