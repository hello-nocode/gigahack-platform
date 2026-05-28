"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { applyToChallenge } from "@/lib/actions/teams";

interface ApplyButtonProps {
  teamId: string;
  challengeId: string;
  disabled?: boolean;
  disabledReason?: string;
  isFull?: boolean;
}

export function ApplyButton({
  teamId,
  challengeId,
  disabled,
  disabledReason,
  isFull,
}: ApplyButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isFull) {
    return (
      <span className="rounded-full bg-red-900/60 px-2.5 py-0.5 text-xs font-medium text-red-300">
        Full
      </span>
    );
  }

  if (disabled) {
    return (
      <Button disabled size="sm" className="bg-slate-700 text-slate-400 cursor-not-allowed">
        {disabledReason || "Apply"}
      </Button>
    );
  }

  async function handleApply() {
    setIsPending(true);
    setError(null);
    try {
      const result = await applyToChallenge(teamId, challengeId);
      if (result.error) {
        setError(result.error);
        setIsPending(false);
      } else {
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleApply}
        disabled={isPending}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isPending ? "Applying..." : "Apply"}
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
