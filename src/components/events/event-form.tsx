"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EventFormState } from "@/lib/actions/events";
import type { Event } from "@db/schema";
import { Plus, Trash2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "registration_open", label: "Registration Open" },
  { value: "applications_open", label: "Applications Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "judging", label: "Judging" },
  { value: "completed", label: "Completed" },
];

interface EventFormProps {
  action: (prev: EventFormState, formData: FormData) => Promise<EventFormState>;
  defaultValues?: Partial<Event>;
  submitLabel?: string;
}

type Section = { title: string; body: string };

export function EventForm({ action, defaultValues, submitLabel = "Save Event" }: EventFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<EventFormState, FormData>(
    action,
    null as unknown as EventFormState,
  );
  const [sections, setSections] = useState<Section[]>(
    (defaultValues?.customSections as Section[] | null | undefined) ?? []
  );

  useEffect(() => {
    if (state?.success) {
      router.push(`/events/${state.slug}` as Route);
    }
  }, [state, router]);

  const fmt = (d: Date | null | undefined) =>
    d ? new Date(d).toISOString().slice(0, 10) : "";

  function addSection() {
    setSections((s) => [...s, { title: "", body: "" }]);
  }
  function removeSection(i: number) {
    setSections((s) => s.filter((_, idx) => idx !== i));
  }
  function updateSection(i: number, key: keyof Section, value: string) {
    setSections((s) => s.map((sec, idx) => idx === i ? { ...sec, [key]: value } : sec));
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="gh-banner-error">{state.error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="gh-label">Title</label>
          <Input name="title" defaultValue={defaultValues?.title ?? ""} placeholder="Gigahack 2025" required />
        </div>

        <div>
          <label className="gh-label">Slug</label>
          <Input name="slug" defaultValue={defaultValues?.slug ?? ""} placeholder="gigahack-2025" required />
          <p style={{ marginTop: "4px", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>URL-friendly, e.g. gigahack-2025</p>
        </div>

        <div>
          <label className="gh-label">Year</label>
          <Input name="year" type="number" defaultValue={defaultValues?.year ?? new Date().getFullYear()} required />
        </div>

        <div className="sm:col-span-2">
          <label className="gh-label">Status</label>
          <select name="status" defaultValue={defaultValues?.status ?? "draft"} className="gh-select">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="gh-label">Min Team Size</label>
          <Input name="minTeamSize" type="number" defaultValue={defaultValues?.minTeamSize ?? 2} />
        </div>

        <div>
          <label className="gh-label">Max Team Size</label>
          <Input name="maxTeamSize" type="number" defaultValue={defaultValues?.maxTeamSize ?? 5} />
        </div>

        <div>
          <label className="gh-label">Max Challenge Applications</label>
          <Input name="maxChallengeApplications" type="number" defaultValue={defaultValues?.maxChallengeApplications ?? 2} />
        </div>

        <div>
          <label className="gh-label">Mentor Slot Duration (min)</label>
          <Input name="mentorSlotDuration" type="number" min={5} max={120}
            defaultValue={(defaultValues as { mentorSlotDuration?: number })?.mentorSlotDuration ?? 30} />
          <p style={{ marginTop: "4px", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>Duration of each mentoring session in minutes</p>
        </div>

        <div>
          <label className="gh-label">Timezone</label>
          <Input name="timezone" defaultValue={defaultValues?.timezone ?? "Europe/Chisinau"} />
        </div>

        <div>
          <label className="gh-label">Start Date</label>
          <Input name="startsAt" type="date" defaultValue={fmt(defaultValues?.startsAt)} />
        </div>

        <div>
          <label className="gh-label">End Date</label>
          <Input name="endsAt" type="date" defaultValue={fmt(defaultValues?.endsAt)} />
        </div>

        <div className="flex items-center gap-3 sm:col-span-2">
          <input id="partnerApplicationsOpen" name="partnerApplicationsOpen" type="checkbox"
            defaultChecked={defaultValues?.partnerApplicationsOpen ?? false} className="gh-checkbox" />
          <label htmlFor="partnerApplicationsOpen" style={{ fontSize: "14px", color: "var(--fg-2)" }}>
            Partner applications open
          </label>
        </div>

        <div className="flex items-center gap-3 sm:col-span-2">
          <input id="registrationOpen" name="registrationOpen" type="checkbox"
            defaultChecked={defaultValues?.registrationOpen ?? false} className="gh-checkbox" />
          <label htmlFor="registrationOpen" style={{ fontSize: "14px", color: "var(--fg-2)" }}>
            Participant registration open
          </label>
        </div>
      </div>

      {/* ── Landing page content ── */}
      <hr className="gh-divider" />
      <p className="gh-kicker mb-4">» Public Landing Page</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="gh-label">Description</label>
          <textarea name="description" rows={4} maxLength={5000}
            defaultValue={defaultValues?.description ?? ""}
            placeholder="What is Gigahack? Who can participate? What will they build?"
            className="gh-textarea" />
        </div>

        <div className="sm:col-span-2">
          <label className="gh-label">Cover Image URL</label>
          <Input name="coverImageUrl" type="url" defaultValue={defaultValues?.coverImageUrl ?? ""}
            placeholder="https://example.com/cover.jpg" />
          <p style={{ marginTop: "4px", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>Displayed as the hero image on the public registration page.</p>
        </div>

        <div className="sm:col-span-2">
          <label className="gh-label">Location</label>
          <Input name="location" defaultValue={defaultValues?.location ?? ""} placeholder="Chișinău, Moldova" />
        </div>
      </div>

      {/* Custom sections */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="gh-label" style={{ margin: 0 }}>Custom Sections</label>
          <button type="button" onClick={addSection}
            className="gh-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Section
          </button>
        </div>
        <p style={{ marginBottom: "12px", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>Add Prize info, Agenda, FAQ, Sponsors, etc.</p>
        {sections.length === 0 && (
          <p style={{ border: "1px dashed var(--line-2)", padding: "20px 16px", textAlign: "center", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
            No sections yet. Click &quot;Add Section&quot; to create one.
          </p>
        )}
        <div className="space-y-3">
          {sections.map((sec, i) => (
            <div key={i} className="p-4" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
              <div className="mb-2 flex items-center gap-2">
                <Input value={sec.title} onChange={(e) => updateSection(i, "title", e.target.value)}
                  placeholder="Section title (e.g. Prizes)" className="text-sm h-8" />
                <button type="button" onClick={() => removeSection(i)}
                  className="shrink-0 transition-colors" style={{ color: "var(--fg-faint)" }}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea value={sec.body} onChange={(e) => updateSection(i, "body", e.target.value)}
                rows={3} placeholder="Section content…" className="gh-textarea" />
            </div>
          ))}
        </div>
        <input type="hidden" name="customSections" value={JSON.stringify(sections)} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : submitLabel}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
