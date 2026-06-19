"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, Users, Lock, Unlock } from "lucide-react";

interface ChallengeSlot {
  id: string;
  title: string;
  slug: string;
  maxSlots: number;
  acceptedCount: number;
  availableSlots: number;
  fillPercentage: number;
  isFull: boolean;
  isNearlyFull: boolean;
  status: string;
}

interface ChallengeSlotsPanelProps {
  initialData: {
    challenges: ChallengeSlot[];
    summary: {
      totalSlots: number;
      totalAccepted: number;
      totalAvailable: number;
      allFull: boolean;
      nearlyFull: boolean;
    };
  };
  applicationsOpen: boolean;
  onToggleApplications: () => Promise<{ success?: true; isOpen?: boolean; error?: string }>;
  onAddSlots: (challengeId: string, slots: number) => Promise<{ success?: true; newMaxTeams?: number; error?: string }>;
  onAddSlotsToAll: (slots: number) => Promise<{ success?: true; updated?: number; error?: string }>;
}

export function ChallengeSlotsPanel({
  initialData,
  applicationsOpen,
  onToggleApplications,
  onAddSlots,
  onAddSlotsToAll,
}: ChallengeSlotsPanelProps) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const [addingToAll, setAddingToAll] = useState(false);

  async function handleToggle() {
    startTransition(async () => {
      const result = await onToggleApplications();
      if (result.success) {
        // Force refresh to get updated state
        window.location.reload();
      }
    });
  }

  async function handleAddSlots(challengeId: string) {
    startTransition(async () => {
      const result = await onAddSlots(challengeId, 1);
      if (result.success) {
        // Update local state optimistically
        setData(prev => ({
          ...prev,
          challenges: prev.challenges.map(c =>
            c.id === challengeId
              ? { ...c, maxSlots: result.newMaxTeams!, availableSlots: c.availableSlots + 1, isFull: false }
              : c
          ),
          summary: {
            ...prev.summary,
            totalSlots: prev.summary.totalSlots + 1,
            totalAvailable: prev.summary.totalAvailable + 1,
            allFull: false,
          },
        }));
      }
    });
  }

  async function handleAddSlotsToAll() {
    setAddingToAll(true);
    startTransition(async () => {
      const result = await onAddSlotsToAll(1);
      if (result.success) {
        window.location.reload();
      }
      setAddingToAll(false);
    });
  }

  const { challenges, summary } = data;

  return (
    <div className="space-y-6">
      {/* Header with toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Challenge Slots</h3>
          <p className="text-sm text-slate-400">
            {summary.totalAccepted} of {summary.totalSlots} slots filled
            {summary.totalAvailable > 0 && ` (${summary.totalAvailable} available)`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={applicationsOpen ? "default" : "outline"}
            size="sm"
            onClick={handleToggle}
            disabled={isPending}
          >
            {applicationsOpen ? (
              <>
                <Unlock className="mr-2 h-4 w-4" />
                Applications Open
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Applications Closed
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddSlotsToAll}
            disabled={isPending || addingToAll}
          >
            <Plus className="mr-2 h-4 w-4" />
            +1 Slot to All
          </Button>
        </div>
      </div>

      {/* Status alerts */}
      {summary.allFull && (
        <div className="rounded-lg border border-red-700/50 bg-red-950/30 p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">All slots are full!</span>
          </div>
          <p className="mt-1 text-sm text-red-300/80">
            Teams cannot apply to any challenge. Add more slots to allow new applications.
          </p>
        </div>
      )}

      {summary.nearlyFull && !summary.allFull && (
        <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-4">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Slots running low</span>
          </div>
          <p className="mt-1 text-sm text-amber-300/80">
            Some challenges are nearly full. Consider adding more slots soon.
          </p>
        </div>
      )}

      {/* Challenge slots list */}
      <div className="space-y-3">
        {challenges.map((challenge) => (
          <div
            key={challenge.id}
            className={`rounded-lg border p-4 ${
              challenge.isFull
                ? "border-red-700/50 bg-red-950/20"
                : challenge.isNearlyFull
                ? "border-amber-700/50 bg-amber-950/20"
                : "border-slate-700/50 bg-slate-900/50"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">{challenge.title}</h4>
                  {challenge.isFull ? (
                    <span className="inline-flex items-center rounded-full bg-red-900/50 px-2 py-0.5 text-xs text-red-300">
                      Full
                    </span>
                  ) : challenge.isNearlyFull ? (
                    <span className="inline-flex items-center rounded-full bg-amber-900/50 px-2 py-0.5 text-xs text-amber-300">
                      Nearly Full
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-300">
                      Available
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-400">
                      <Users className="inline h-4 w-4 mr-1" />
                      {challenge.acceptedCount} / {challenge.maxSlots} teams
                    </span>
                    <span className={challenge.isFull ? "text-red-400" : challenge.isNearlyFull ? "text-amber-400" : "text-green-400"}>
                      {challenge.availableSlots} free
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        challenge.isFull
                          ? "bg-red-500"
                          : challenge.isNearlyFull
                          ? "bg-amber-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(challenge.fillPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddSlots(challenge.id)}
                disabled={isPending}
                className="shrink-0"
              >
                <Plus className="mr-1 h-4 w-4" />
                +1
              </Button>
            </div>
          </div>
        ))}
      </div>

      {challenges.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center">
          <p className="text-slate-400">No challenges created yet.</p>
          <p className="text-sm text-slate-500 mt-1">
            Create challenges to enable team applications.
          </p>
        </div>
      )}
    </div>
  );
}
