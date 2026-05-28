"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GenerateSlotsState } from "@/lib/actions/mentors";

interface SlotGeneratorFormProps {
  action: (prev: GenerateSlotsState, formData: FormData) => Promise<GenerateSlotsState>;
  eventStartDate?: string;
  eventEndDate?: string;
}

export function SlotGeneratorForm({ action, eventStartDate, eventEndDate }: SlotGeneratorFormProps) {
  const [state, formAction, isPending] = useActionState<GenerateSlotsState, FormData>(
    action,
    null as unknown as GenerateSlotsState,
  );

  const today = new Date().toISOString().slice(0, 10);
  const minDate = eventStartDate ?? today;
  const maxDate = eventEndDate;

  return (
    <form action={formAction} className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Generate Slots
      </h3>

      {state?.error && (
        <div className="mb-4 rounded-lg border border-red-700/50 bg-red-900/30 p-3">
          <p className="text-sm text-red-300">{state.error}</p>
        </div>
      )}
      {state?.success && (
        <div className="mb-4 rounded-lg border border-green-700/50 bg-green-900/30 p-3">
          <p className="text-sm text-green-300">
            ✓ Generated {state.count} slot{state.count !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Date</label>
          <Input
            name="date"
            type="date"
            min={minDate}
            max={maxDate}
            required
            className="border-slate-600 bg-slate-700/50 text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">From (hour)</label>
          <Input
            name="startHour"
            type="number"
            min={0}
            max={23}
            defaultValue={9}
            required
            className="border-slate-600 bg-slate-700/50 text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Until (hour)</label>
          <Input
            name="endHour"
            type="number"
            min={1}
            max={24}
            defaultValue={18}
            required
            className="border-slate-600 bg-slate-700/50 text-white"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="mt-4 bg-blue-600 hover:bg-blue-700"
        size="sm"
      >
        {isPending ? "Generating…" : "Generate Slots"}
      </Button>
    </form>
  );
}
