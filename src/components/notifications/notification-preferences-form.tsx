"use client";

import { useActionState } from "react";
import { savePreferences } from "@/lib/actions/notifications";
import type { PreferencesState } from "@/lib/actions/notifications";
import type { NotificationPreferences } from "@db/schema";
import { Button } from "@/components/ui/button";

interface Props {
  preferences: NotificationPreferences;
}

const PREFS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  {
    key: "emailOnMentorBooked",
    label: "Mentoring session booked",
    description: "When a team books a slot with you (mentors) or your booking is confirmed",
  },
  {
    key: "emailOnSessionReminder",
    label: "Session reminder (15 min before)",
    description: "Reminder email sent 15 minutes before a mentoring session starts",
  },
  {
    key: "emailOnJoinRequest",
    label: "Team join requests",
    description: "When someone requests to join your team (team leaders)",
  },
  {
    key: "emailOnJoinReviewed",
    label: "Join request decision",
    description: "When your request to join a team is accepted or rejected",
  },
  {
    key: "emailOnAdminBroadcast",
    label: "Platform announcements",
    description: "Important announcements and messages sent by the event organizers",
  },
];

export function NotificationPreferencesForm({ preferences }: Props) {
  const [state, formAction, isPending] = useActionState<PreferencesState, FormData>(
    savePreferences,
    null as unknown as PreferencesState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.success && <div className="gh-banner-success mb-4">Preferences saved.</div>}
      {state?.error && <div className="gh-banner-error mb-4">{state.error}</div>}

      <div className="space-y-3">
        {PREFS.map(({ key, label, description }) => (
          <label
            key={key}
            className="gh-card-hover flex cursor-pointer items-start gap-4 p-4"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <input type="checkbox" name={key} defaultChecked={preferences[key] as boolean} className="gh-checkbox mt-0.5" />
            <div>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--fg-1)" }}>{label}</p>
              <p style={{ marginTop: "2px", fontSize: "12px", color: "var(--fg-3)" }}>{description}</p>
            </div>
          </label>
        ))}
      </div>

      <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save preferences"}</Button>
    </form>
  );
}
