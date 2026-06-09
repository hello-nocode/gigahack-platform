"use client";

import { useActionState } from "react";
import { createAdminBroadcast } from "@/lib/actions/notifications";
import type { BroadcastState } from "@/lib/actions/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface EventOption {
  id: string;
  title: string;
  year: number;
}

interface Props {
  events: EventOption[];
}

export function AdminBroadcastForm({ events }: Props) {
  const now = new Date().toISOString().slice(0, 16);

  const [state, formAction, isPending] = useActionState<BroadcastState, FormData>(
    createAdminBroadcast,
    null as unknown as BroadcastState,
  );

  return (
    <div className="mb-10 p-6" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <p className="gh-kicker mb-4">» New Broadcast</p>

      {state?.success && <div className="gh-banner-success mb-4">Broadcast scheduled successfully.</div>}
      {state?.error && <div className="gh-banner-error mb-4">{state.error}</div>}

      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="gh-label">Title</label>
            <Input name="title" required placeholder="Announcement title" />
          </div>

          <div className="sm:col-span-2">
            <label className="gh-label">Message</label>
            <textarea name="body" required rows={3} placeholder="Write your message here…" className="gh-textarea" />
          </div>

          <div>
            <label className="gh-label">Link (optional)</label>
            <Input name="link" placeholder="/events/..." />
          </div>

          <div>
            <label className="gh-label">Send at</label>
            <Input name="sendAt" type="datetime-local" defaultValue={now} />
            <p style={{ marginTop: "4px", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>Leave as now to send immediately</p>
          </div>
        </div>

        <hr className="gh-divider" />
        <p className="gh-kicker mb-3">» Recipients Filter</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="gh-label">Event (optional)</label>
            <select name="eventId" className="gh-select">
              <option value="">— All events —</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.title} ({e.year})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="gh-label">Role filter (optional)</label>
            <div className="flex flex-wrap gap-3 pt-2">
              {(["participant", "mentor", "partner_admin", "admin"] as const).map((role) => (
                <label key={role} className="flex items-center gap-1.5" style={{ fontSize: "13px", color: "var(--fg-2)", cursor: "pointer" }}>
                  <input type="checkbox" name="filterRole" value={role} className="gh-checkbox" />
                  {role}
                </label>
              ))}
            </div>
            <p style={{ marginTop: "6px", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>If none selected = all participants of chosen event</p>
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="gap-2">
          <Send className="h-4 w-4" />
          {isPending ? "Scheduling…" : "Schedule Broadcast"}
        </Button>
      </form>
    </div>
  );
}
