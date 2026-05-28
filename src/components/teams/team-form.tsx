"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { createTeam, updateTeam, updateTeamJoinSetting } from "@/lib/actions/teams";
import type { TeamFormState, JoinSettingState } from "@/lib/actions/teams";
import type { Team } from "@db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TeamFormProps {
  eventId: string;
  eventSlug: string;
  defaultValues?: Partial<Team>;
  memberCount?: number;
  minTeamSize?: number;
  maxTeamSize?: number;
}

export function TeamForm({ eventId, eventSlug, defaultValues, memberCount = 0, minTeamSize = 2, maxTeamSize = 5 }: TeamFormProps) {
  const router = useRouter();
  const isEditing = !!defaultValues?.id;

  const [acceptingNewMembers, setAcceptingNewMembers] = useState(defaultValues?.acceptingNewMembers ?? true);
  const [joinSettingError, setJoinSettingError] = useState<string | null>(null);

  const action = isEditing
    ? updateTeam.bind(null, defaultValues.id!)
    : createTeam.bind(null, eventId);

  const [state, formAction, isPending] = useActionState<TeamFormState, FormData>(
    action,
    null as unknown as TeamFormState,
  );

  useEffect(() => {
    if (state?.success) {
      router.push(`/events/${eventSlug}/teams/${state.teamId}` as Route);
    }
  }, [state, eventSlug, router]);

  const handleToggleAcceptingNewMembers = async () => {
    if (!isEditing || !defaultValues?.id) return;
    setJoinSettingError(null);
    const newValue = !acceptingNewMembers;
    const result: JoinSettingState = await updateTeamJoinSetting(defaultValues.id, newValue);
    if (result.success) {
      setAcceptingNewMembers(result.acceptingNewMembers);
    } else {
      setJoinSettingError(result.error);
    }
  };

  const isFull = memberCount >= maxTeamSize;
  const isBelowMin = memberCount < minTeamSize;
  const canToggleJoinSetting = isEditing && !isFull && !isBelowMin;

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-lg border border-red-700/50 bg-red-900/30 p-4">
          <p className="text-sm text-red-300">{state.error}</p>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Team Name *</label>
        <Input
          name="name"
          defaultValue={defaultValues?.name ?? ""}
          required
          minLength={2}
          maxLength={60}
          placeholder="Awesome Hackers"
          className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Description</label>
        <textarea
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          rows={3}
          maxLength={500}
          placeholder="What's your team about?"
          className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isEditing && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Accept Join Requests</h3>
              <p className="text-xs text-slate-400">
                Allow participants to request to join your team
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleAcceptingNewMembers}
              disabled={!canToggleJoinSetting}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                acceptingNewMembers ? "bg-blue-600" : "bg-slate-600"
              } ${!canToggleJoinSetting ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              aria-label={acceptingNewMembers ? "Disable join requests" : "Enable join requests"}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  acceptingNewMembers ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {joinSettingError && (
            <p className="mt-2 text-xs text-red-400">{joinSettingError}</p>
          )}
          {isFull && (
            <p className="mt-2 text-xs text-amber-400">
              Team is full ({memberCount}/{maxTeamSize} members). Cannot accept new members.
            </p>
          )}
          {isBelowMin && (
            <p className="mt-2 text-xs text-amber-400">
              Team needs at least {minTeamSize} members (currently {memberCount}). You must accept join requests.
            </p>
          )}
          {!isFull && !isBelowMin && memberCount > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {memberCount} / {maxTeamSize} members
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
          {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Team"}
        </Button>
        <Button type="button" variant="outline" className="border-slate-500 bg-slate-800 text-white hover:bg-slate-700 hover:text-white"
          onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
