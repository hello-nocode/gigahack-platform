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
      {state?.error && <div className="gh-banner-error">{state.error}</div>}

      <div>
        <label className="gh-label">Team Name *</label>
        <Input name="name" defaultValue={defaultValues?.name ?? ""} required minLength={2} maxLength={60} placeholder="Awesome Hackers" />
      </div>

      <div>
        <label className="gh-label">Description</label>
        <textarea name="description" defaultValue={defaultValues?.description ?? ""} rows={3} maxLength={500}
          placeholder="What's your team about?" className="gh-textarea" />
      </div>

      {isEditing && (
        <div className="p-4" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--fg-1)" }}>Accept Join Requests</p>
              <p style={{ fontSize: "12px", color: "var(--fg-3)", marginTop: "2px" }}>Allow participants to request to join your team</p>
            </div>
            <button
              type="button"
              onClick={handleToggleAcceptingNewMembers}
              disabled={!canToggleJoinSetting}
              data-on={acceptingNewMembers ? "true" : "false"}
              className="gh-toggle"
              aria-label={acceptingNewMembers ? "Disable join requests" : "Enable join requests"}
            >
              <span className="gh-toggle-thumb" />
            </button>
          </div>
          {joinSettingError && <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--danger)" }}>{joinSettingError}</p>}
          {isFull && <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--warn)", fontFamily: "var(--font-mono)" }}>Team is full ({memberCount}/{maxTeamSize} members). Cannot accept new members.</p>}
          {isBelowMin && <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--warn)", fontFamily: "var(--font-mono)" }}>Team needs at least {minTeamSize} members (currently {memberCount}). You must accept join requests.</p>}
          {!isFull && !isBelowMin && memberCount > 0 && <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>{memberCount} / {maxTeamSize} members</p>}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Team"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
