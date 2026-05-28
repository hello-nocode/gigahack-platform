"use client";

import { ChallengeForm } from "./challenge-form";
import type { ChallengeFormState, upsertCriteria, upsertPrizes } from "@/lib/actions/challenges";
import type { Challenge, JudgingCriterion, ChallengePrize } from "@db/schema";

interface EditChallengeFormWrapperProps {
  challenge: Challenge;
  criteria: JudgingCriterion[];
  prizes: ChallengePrize[];
  eventId: string;
  eventSlug: string;
  isAdmin?: boolean;
}

export function EditChallengeFormWrapper({
  challenge,
  criteria,
  prizes,
  eventId,
  eventSlug,
  isAdmin = false,
}: EditChallengeFormWrapperProps) {
  async function updateAction(prev: ChallengeFormState, formData: FormData): Promise<ChallengeFormState> {
    const { updateChallenge } = await import("@/lib/actions/challenges");
    return updateChallenge(challenge.id, eventId, prev, formData);
  }

  async function saveCriteria(rows: Parameters<typeof upsertCriteria>[1]) {
    const { upsertCriteria } = await import("@/lib/actions/challenges");
    return upsertCriteria(challenge.id, rows);
  }

  async function savePrizes(rows: Parameters<typeof upsertPrizes>[1]) {
    const { upsertPrizes } = await import("@/lib/actions/challenges");
    return upsertPrizes(challenge.id, rows);
  }

  return (
    <ChallengeForm
      action={updateAction}
      onSaveCriteria={saveCriteria}
      onSavePrizes={savePrizes}
      defaultValues={challenge}
      defaultCriteria={criteria}
      defaultPrizes={prizes}
      eventSlug={eventSlug}
      submitLabel="Save Changes"
      isAdmin={isAdmin}
    />
  );
}
