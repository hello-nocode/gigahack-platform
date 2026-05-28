"use client";

import { ChallengeForm } from "./challenge-form";
import type { ChallengeFormState } from "@/lib/actions/challenges";

interface NewChallengeFormWrapperProps {
  eventId: string;
  eventSlug: string;
  partnerId: string;
}

export function NewChallengeFormWrapper({ eventId, eventSlug, partnerId }: NewChallengeFormWrapperProps) {
  async function createAction(prev: ChallengeFormState, formData: FormData): Promise<ChallengeFormState> {
    formData.set("partnerId", partnerId);
    const { createChallenge } = await import("@/lib/actions/challenges");
    return createChallenge(eventId, prev, formData);
  }

  async function saveCriteriaPlaceholder() {
    return { success: true as const };
  }

  async function savePrizesPlaceholder() {
    // Prizes can only be added after challenge creation (requires challengeId)
    return { success: true as const };
  }

  return (
    <ChallengeForm
      action={createAction}
      onSaveCriteria={saveCriteriaPlaceholder}
      onSavePrizes={savePrizesPlaceholder}
      eventSlug={eventSlug}
      submitLabel="Create Challenge"
    />
  );
}
