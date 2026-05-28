"use server";

import { db } from "@db/index";
import { challenges, judgingCriteria, partnerProfiles, challengePrizes, teamChallengeApplications } from "@db/schema";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { eq, and, count } from "drizzle-orm";
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

  try {
    const prizes = parsed.data.prizes
      ? JSON.parse(parsed.data.prizes)
      : null;

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
        prizes,
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

  const prizes = parsed.data.prizes ? JSON.parse(parsed.data.prizes) : null;

  await db
    .update(challenges)
    .set({ ...parsed.data, prizes, updatedAt: new Date() })
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
