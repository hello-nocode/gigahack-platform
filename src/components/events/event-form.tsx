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
        <div className="rounded-lg border border-red-700/50 bg-red-900/30 p-4">
          <p className="text-sm text-red-300">{state.error}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium text-slate-300">Title</label>
          <Input
            name="title"
            defaultValue={defaultValues?.title ?? ""}
            placeholder="Gigahack 2025"
            required
            className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Slug</label>
          <Input
            name="slug"
            defaultValue={defaultValues?.slug ?? ""}
            placeholder="gigahack-2025"
            required
            className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500">URL-friendly, e.g. gigahack-2025</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Year</label>
          <Input
            name="year"
            type="number"
            defaultValue={defaultValues?.year ?? new Date().getFullYear()}
            required
            className="border-slate-600 bg-slate-700/50 text-white"
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium text-slate-300">Status</label>
          <select
            name="status"
            defaultValue={defaultValues?.status ?? "draft"}
            className="h-10 w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Min Team Size</label>
          <Input
            name="minTeamSize"
            type="number"
            defaultValue={defaultValues?.minTeamSize ?? 2}
            className="border-slate-600 bg-slate-700/50 text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Max Team Size</label>
          <Input
            name="maxTeamSize"
            type="number"
            defaultValue={defaultValues?.maxTeamSize ?? 5}
            className="border-slate-600 bg-slate-700/50 text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Max Challenge Applications</label>
          <Input
            name="maxChallengeApplications"
            type="number"
            defaultValue={defaultValues?.maxChallengeApplications ?? 2}
            className="border-slate-600 bg-slate-700/50 text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Timezone</label>
          <Input
            name="timezone"
            defaultValue={defaultValues?.timezone ?? "Europe/Chisinau"}
            className="border-slate-600 bg-slate-700/50 text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Start Date</label>
          <Input
            name="startsAt"
            type="date"
            defaultValue={fmt(defaultValues?.startsAt)}
            className="border-slate-600 bg-slate-700/50 text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">End Date</label>
          <Input
            name="endsAt"
            type="date"
            defaultValue={fmt(defaultValues?.endsAt)}
            className="border-slate-600 bg-slate-700/50 text-white"
          />
        </div>

        <div className="flex items-center gap-3 sm:col-span-2">
          <input
            id="partnerApplicationsOpen"
            name="partnerApplicationsOpen"
            type="checkbox"
            defaultChecked={defaultValues?.partnerApplicationsOpen ?? false}
            className="h-4 w-4 rounded border-slate-600 accent-blue-500"
          />
          <label htmlFor="partnerApplicationsOpen" className="text-sm text-slate-300">
            Partner applications open
          </label>
        </div>

        <div className="flex items-center gap-3 sm:col-span-2">
          <input
            id="registrationOpen"
            name="registrationOpen"
            type="checkbox"
            defaultChecked={defaultValues?.registrationOpen ?? false}
            className="h-4 w-4 rounded border-slate-600 accent-blue-500"
          />
          <label htmlFor="registrationOpen" className="text-sm text-slate-300">
            Participant registration open
          </label>
        </div>
      </div>

      {/* ── Landing page content ── */}
      <div className="border-t border-slate-700 pt-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Public Landing Page</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium text-slate-300">Description</label>
            <textarea
              name="description"
              rows={4}
              maxLength={5000}
              defaultValue={defaultValues?.description ?? ""}
              placeholder="What is Gigahack? Who can participate? What will they build?"
              className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium text-slate-300">Cover Image URL</label>
            <Input
              name="coverImageUrl"
              type="url"
              defaultValue={defaultValues?.coverImageUrl ?? ""}
              placeholder="https://example.com/cover.jpg"
              className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-500">Displayed as the hero image on the public registration page.</p>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium text-slate-300">Location</label>
            <Input
              name="location"
              defaultValue={defaultValues?.location ?? ""}
              placeholder="Chișinău, Moldova"
              className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Custom sections */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">Custom Sections</label>
            <button
              type="button"
              onClick={addSection}
              className="flex items-center gap-1.5 rounded-md bg-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Section
            </button>
          </div>
          <p className="mb-3 text-xs text-slate-500">Add Prize info, Agenda, FAQ, Sponsors, etc.</p>
          {sections.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-700 px-4 py-5 text-center text-xs text-slate-500">
              No sections yet. Click &quot;Add Section&quot; to create one.
            </p>
          )}
          <div className="space-y-3">
            {sections.map((sec, i) => (
              <div key={i} className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Input
                    value={sec.title}
                    onChange={(e) => updateSection(i, "title", e.target.value)}
                    placeholder="Section title (e.g. Prizes)"
                    className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500 text-sm h-8"
                  />
                  <button
                    type="button"
                    onClick={() => removeSection(i)}
                    className="shrink-0 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={sec.body}
                  onChange={(e) => updateSection(i, "body", e.target.value)}
                  rows={3}
                  placeholder="Section content…"
                  className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          {/* Serialise sections as JSON hidden input */}
          <input type="hidden" name="customSections" value={JSON.stringify(sections)} />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isPending ? "Saving..." : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-slate-500 bg-slate-800 text-white hover:bg-slate-700 hover:text-white"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
