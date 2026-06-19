"use server";

import { db } from "@db/index";
import { challenges, judgingCriteria, partnerProfiles, challengePrizes, teamChallengeApplications } from "@db/schema";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { eq, and, count, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requirePartnerOrAdmin(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const admin = await isAdmin(session.user.id);
  if (admin) return { userId: session.user.id, admin: true, profile: null };

  const [profile] = await db
    .select()
    .from(partnerProfiles)
    .where(
      and(
        eq(partnerProfiles.userId, session.user.id),
        eq(partnerProfiles.eventId, eventId),
      ),
    );

  if (!profile) redirect("/dashboard");
  return { userId: session.user.id, admin: false, profile };
}

async function requireAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  return isAdmin(session.user.id);
}

function parsePrizes(raw: string | undefined): { ok: true; value: unknown } | { ok: false } {
  if (!raw) return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const challengeSchema = z.object({
  title: z.string().min(3).max(120),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),
  status: z.enum(["draft", "published", "archived"]),
  description: z.string().optional(),
  problemStatement: z.string().optional(),
  expectedSolution: z.string().optional(),
  techRequirements: z.string().optional(),
  maxTeams: z.coerce.number().int().min(1).optional(),
  prizes: z.string().optional(),
});

const criterionSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().optional(),
  weight: z.coerce.number().int().min(1).max(100),
  maxScore: z.coerce.number().int().min(1).max(100).default(10),
  sortOrder: z.coerce.number().int().default(0),
});

export type ChallengeFormState =
  | { success: true; slug: string; error?: never }
  | { success?: never; error: string };

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function createChallenge(
  eventId: string,
  _prev: ChallengeFormState,
  formData: FormData,
): Promise<ChallengeFormState> {
  const { profile, admin } = await requirePartnerOrAdmin(eventId);

  const raw = Object.fromEntries(formData);
  const parsed = challengeSchema.safeParse(raw);
  if (!parsed.success)
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };

  let partnerId = profile?.id;
  if (admin && !partnerId) {
    const adminProfile = formData.get("partnerId") as string | null;
    if (!adminProfile) return { error: "Admin must select a partner profile" };
    partnerId = adminProfile;
  }

  const prizesResult = parsePrizes(parsed.data.prizes);
  if (!prizesResult.ok) return { error: "Invalid prizes format" };

  try {
    const [created] = await db
      .insert(challenges)
      .values({
        eventId,
        partnerId: partnerId!,
        title: parsed.data.title,
        slug: parsed.data.slug,
        status: parsed.data.status,
        description: parsed.data.description ?? null,
        problemStatement: parsed.data.problemStatement ?? null,
        expectedSolution: parsed.data.expectedSolution ?? null,
        techRequirements: parsed.data.techRequirements ?? null,
        maxTeams: parsed.data.maxTeams ?? null,
        prizes: prizesResult.value,
      })
      .returning();

    revalidatePath(`/events`);
    return { success: true, slug: created!.slug };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("unique")) return { error: "Slug already exists for this event" };
    return { error: msg };
  }
}

export async function updateChallenge(
  challengeId: string,
  eventId: string,
  _prev: ChallengeFormState,
  formData: FormData,
): Promise<ChallengeFormState> {
  const { userId, admin } = await requirePartnerOrAdmin(eventId);

  const [existing] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId));
  if (!existing) return { error: "Challenge not found" };

  if (!admin) {
    const [ownerProfile] = await db
      .select()
      .from(partnerProfiles)
      .where(
        and(
          eq(partnerProfiles.id, existing.partnerId),
          eq(partnerProfiles.userId, userId),
        ),
      );
    if (!ownerProfile) return { error: "Not authorised" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = challengeSchema.safeParse(raw);
  if (!parsed.success)
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };

  // Partners cannot publish challenges without prizes and criteria
  if (!admin && parsed.data.status === "published") {
    const [prizeResult] = await db
      .select({ count: count() })
      .from(challengePrizes)
      .where(eq(challengePrizes.challengeId, challengeId));
    const [criteriaResult] = await db
      .select({ count: count() })
      .from(judgingCriteria)
      .where(eq(judgingCriteria.challengeId, challengeId));

    const hasPrizes = (prizeResult?.count ?? 0) > 0;
    const hasCriteria = (criteriaResult?.count ?? 0) > 0;

    if (!hasPrizes || !hasCriteria) {
      return {
        error:
          "Cannot publish challenge: Please add at least one prize and one judging criterion first. Save as draft instead.",
      };
    }
  }

  const prizesResult = parsePrizes(parsed.data.prizes);
  if (!prizesResult.ok) return { error: "Invalid prizes format" };

  await db
    .update(challenges)
    .set({ ...parsed.data, prizes: prizesResult.value, updatedAt: new Date() })
    .where(eq(challenges.id, challengeId));

  revalidatePath(`/events`);
  return { success: true, slug: parsed.data.slug };
}

export async function upsertCriteria(
  challengeId: string,
  criteria: Array<{
    name: string;
    description?: string;
    weight: number;
    maxScore?: number;
    sortOrder?: number;
  }>,
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // Authorization check - must be admin or challenge owner
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    const [challenge] = await db.select({ partnerId: challenges.partnerId }).from(challenges).where(eq(challenges.id, challengeId));
    if (!challenge) return { error: "Challenge not found" };
    const [ownerProfile] = await db
      .select({ id: partnerProfiles.id })
      .from(partnerProfiles)
      .where(and(eq(partnerProfiles.id, challenge.partnerId), eq(partnerProfiles.userId, session.user.id)));
    if (!ownerProfile) return { error: "Not authorised" };
  }

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight !== 100)
    return { error: `Weights must sum to 100 (currently ${totalWeight})` };

  const parsed = z.array(criterionSchema).safeParse(criteria);
  if (!parsed.success)
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };

  // Note: Sequential operations without transaction (Neon HTTP driver limitation)
  await db.delete(judgingCriteria).where(eq(judgingCriteria.challengeId, challengeId));
  if (parsed.data.length > 0) {
    await db.insert(judgingCriteria).values(parsed.data.map((c) => ({ ...c, challengeId })));
  }

  revalidatePath(`/events`);
  return { success: true };
}

// ── Prizes ───────────────────────────────────────────────────────────────────

export async function getPrizesForChallenge(challengeId: string) {
  return db
    .select()
    .from(challengePrizes)
    .where(eq(challengePrizes.challengeId, challengeId))
    .orderBy(challengePrizes.sortOrder);
}

export async function upsertPrizes(
  challengeId: string,
  prizes: Array<{
    place: string;
    value: string;
    type: string;
    numTeams: number;
    sortOrder: number;
  }>,
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // Authorization check - must be admin or challenge owner
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    const [challenge] = await db.select({ partnerId: challenges.partnerId }).from(challenges).where(eq(challenges.id, challengeId));
    if (!challenge) return { error: "Challenge not found" };
    const [ownerProfile] = await db
      .select({ id: partnerProfiles.id })
      .from(partnerProfiles)
      .where(and(eq(partnerProfiles.id, challenge.partnerId), eq(partnerProfiles.userId, session.user.id)));
    if (!ownerProfile) return { error: "Not authorised" };
  }

  // Validate data
  const prizeSchema = z.array(z.object({
    place: z.string().min(1),
    value: z.string().min(1),
    type: z.enum(["cash", "voucher", "product", "service", "other"]),
    numTeams: z.number().int().min(1),
    sortOrder: z.number().int().min(0),
  }));
  const parsed = prizeSchema.safeParse(prizes);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(", ") };

  // Note: Sequential operations without transaction (Neon HTTP driver limitation)
  await db.delete(challengePrizes).where(eq(challengePrizes.challengeId, challengeId));
  if (parsed.data.length > 0) {
    await db.insert(challengePrizes).values(parsed.data.map((p) => ({ ...p, challengeId })));
  }

  revalidatePath(`/events`);
  return { success: true };
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getChallengesForEvent(eventId: string) {
  return db
    .select()
    .from(challenges)
    .where(eq(challenges.eventId, eventId))
    .orderBy(challenges.createdAt);
}

export async function getPublishedChallengesWithDetails(eventId: string) {
  return db
    .select({
      challenge: challenges,
      partner: {
        id: partnerProfiles.id,
        companyName: partnerProfiles.companyName,
        logoUrl: partnerProfiles.logoUrl,
      },
    })
    .from(challenges)
    .innerJoin(partnerProfiles, eq(partnerProfiles.id, challenges.partnerId))
    .where(and(eq(challenges.eventId, eventId), eq(challenges.status, "published")))
    .orderBy(challenges.createdAt);
}

export async function getAcceptedApplicationCountForChallenge(challengeId: string) {
  const [result] = await db
    .select({ count: count() })
    .from(teamChallengeApplications)
    .where(and(eq(teamChallengeApplications.challengeId, challengeId), eq(teamChallengeApplications.status, "accepted")));
  return result?.count ?? 0;
}

export async function getTeamApplicationStatus(teamId: string, challengeId: string) {
  const [application] = await db
    .select({
      id: teamChallengeApplications.id,
      status: teamChallengeApplications.status,
    })
    .from(teamChallengeApplications)
    .where(
      and(
        eq(teamChallengeApplications.teamId, teamId),
        eq(teamChallengeApplications.challengeId, challengeId),
      ),
    );
  return application ?? null;
}

export async function getChallengeBySlug(eventId: string, slug: string) {
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(and(eq(challenges.eventId, eventId), eq(challenges.slug, slug)));
  return challenge ?? null;
}

export async function getCriteriaForChallenge(challengeId: string) {
  return db
    .select()
    .from(judgingCriteria)
    .where(eq(judgingCriteria.challengeId, challengeId))
    .orderBy(judgingCriteria.sortOrder);
}

// ── Admin: Slot Management ───────────────────────────────────────────────────

export type SlotManagementResult =
  | { success: true; newMaxTeams: number; error?: never }
  | { success?: never; error: string };

export async function getChallengesWithSlotStatus(eventId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorised" };

  const challengesList = await db
    .select({
      id: challenges.id,
      title: challenges.title,
      slug: challenges.slug,
      maxTeams: challenges.maxTeams,
      status: challenges.status,
    })
    .from(challenges)
    .where(eq(challenges.eventId, eventId))
    .orderBy(challenges.createdAt);

  // Single grouped query instead of one count query per challenge
  const acceptedCounts =
    challengesList.length > 0
      ? await db
          .select({
            challengeId: teamChallengeApplications.challengeId,
            c: count(),
          })
          .from(teamChallengeApplications)
          .where(
            and(
              inArray(
                teamChallengeApplications.challengeId,
                challengesList.map((c) => c.id),
              ),
              eq(teamChallengeApplications.status, "accepted"),
            ),
          )
          .groupBy(teamChallengeApplications.challengeId)
      : [];
  const countByChallenge = new Map(acceptedCounts.map((r) => [r.challengeId, r.c]));

  const challengesWithSlots = challengesList.map((challenge) => {
    const acceptedCount = countByChallenge.get(challenge.id) ?? 0;
    const maxSlots = challenge.maxTeams ?? 5;
      const availableSlots = Math.max(0, maxSlots - acceptedCount);
      const fillPercentage = maxSlots > 0 ? (acceptedCount / maxSlots) * 100 : 0;

      return {
        ...challenge,
        maxSlots,
        acceptedCount,
        availableSlots,
        fillPercentage,
        isFull: acceptedCount >= maxSlots,
        isNearlyFull: fillPercentage >= 80,
      };
  });

  // Calculate totals
  const totalSlots = challengesWithSlots.reduce((sum, c) => sum + c.maxSlots, 0);
  const totalAccepted = challengesWithSlots.reduce((sum, c) => sum + c.acceptedCount, 0);
  const totalAvailable = challengesWithSlots.reduce((sum, c) => sum + c.availableSlots, 0);

  return {
    challenges: challengesWithSlots,
    summary: {
      totalSlots,
      totalAccepted,
      totalAvailable,
      allFull: totalAvailable === 0,
      nearlyFull: challengesWithSlots.some(c => c.isNearlyFull && !c.isFull),
    },
  };
}

export async function addSlotsToChallenge(
  challengeId: string,
  additionalSlots: number,
): Promise<SlotManagementResult> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorised" };

  if (additionalSlots < 1 || additionalSlots > 100) {
    return { error: "Invalid slot count (1-100)" };
  }

  const [challenge] = await db
    .select({ maxTeams: challenges.maxTeams, eventId: challenges.eventId })
    .from(challenges)
    .where(eq(challenges.id, challengeId));

  if (!challenge) return { error: "Challenge not found" };

  const currentMax = challenge.maxTeams ?? 5;
  const newMaxTeams = currentMax + additionalSlots;

  await db
    .update(challenges)
    .set({ maxTeams: newMaxTeams, updatedAt: new Date() })
    .where(eq(challenges.id, challengeId));

  revalidatePath(`/admin/events/${challenge.eventId}/challenges`);
  return { success: true, newMaxTeams };
}

export async function addSlotsToAllChallenges(
  eventId: string,
  additionalSlots: number,
): Promise<{ success: true; updated: number; error?: never } | { success?: never; error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorised" };

  if (additionalSlots < 1 || additionalSlots > 100) {
    return { error: "Invalid slot count (1-100)" };
  }

  // Single batch update instead of one query per challenge
  const updatedRows = await db
    .update(challenges)
    .set({
      maxTeams: sql`coalesce(${challenges.maxTeams}, 5) + ${additionalSlots}`,
      updatedAt: new Date(),
    })
    .where(eq(challenges.eventId, eventId))
    .returning({ id: challenges.id });

  const updated = updatedRows.length;
  if (updated === 0) {
    return { error: "No challenges found for this event" };
  }

  revalidatePath(`/admin/events/${eventId}/challenges`);
  return { success: true, updated };
}
