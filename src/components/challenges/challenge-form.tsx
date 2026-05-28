"use client";

import { useActionState, useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChallengeFormState } from "@/lib/actions/challenges";
import type { Challenge, JudgingCriterion, ChallengePrize } from "@db/schema";
import { Trash2, Plus } from "lucide-react";

interface CriterionRow {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
  sortOrder: number;
}

interface PrizeRow {
  id: string;
  place: string;
  value: string;
  type: "cash" | "voucher" | "product" | "service" | "other";
  numTeams: number;
  sortOrder: number;
}

interface ChallengeFormProps {
  action: (prev: ChallengeFormState, formData: FormData) => Promise<ChallengeFormState>;
  onSaveCriteria: (criteria: CriterionRow[]) => Promise<{ success?: true; error?: string }>;
  onSavePrizes: (prizes: PrizeRow[]) => Promise<{ success?: true; error?: string }>;
  defaultValues?: Partial<Challenge>;
  defaultCriteria?: JudgingCriterion[];
  defaultPrizes?: ChallengePrize[];
  eventSlug: string;
  submitLabel?: string;
  isAdmin?: boolean;
}

export function ChallengeForm({
  action,
  onSaveCriteria,
  onSavePrizes,
  defaultValues,
  defaultCriteria = [],
  defaultPrizes = [],
  eventSlug,
  submitLabel = "Save Challenge",
  isAdmin = false,
}: ChallengeFormProps) {
  const router = useRouter();
  const [state, formAction, isActionPending] = useActionState<ChallengeFormState, FormData>(
    action,
    null as unknown as ChallengeFormState,
  );
  const [isSavingCriteria, startCriteriaTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const [criteria, setCriteria] = useState<CriterionRow[]>(
    defaultCriteria.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      weight: c.weight,
      maxScore: c.maxScore,
      sortOrder: c.sortOrder,
    })),
  );
  const [criteriaError, setCriteriaError] = useState<string | null>(null);

  const [prizes, setPrizes] = useState<PrizeRow[]>(
    defaultPrizes.map((p) => ({
      id: p.id,
      place: p.place,
      value: p.value,
      type: p.type as PrizeRow["type"],
      numTeams: p.numTeams,
      sortOrder: p.sortOrder,
    })),
  );
  const [prizesError, setPrizesError] = useState<string | null>(null);

  const isPending = isActionPending || isSavingCriteria;
  const totalWeight = criteria.reduce((s, c) => s + Number(c.weight), 0);

  useEffect(() => {
    if (state?.success) {
      router.push(`/events/${eventSlug}/challenges/${state.slug}` as Route);
    }
  }, [state, eventSlug, router]);

  function addCriterion() {
    setCriteria((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", description: "", weight: 0, maxScore: 10, sortOrder: prev.length },
    ]);
  }

  function removeCriterion(id: string) {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  }

  function updateCriterion(id: string, field: keyof CriterionRow, value: string | number) {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  }

  function addPrize() {
    setPrizes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), place: "", value: "", type: "cash", numTeams: 1, sortOrder: prev.length },
    ]);
  }

  function removePrize(id: string) {
    setPrizes((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePrize(id: string, field: keyof PrizeRow, value: string | number) {
    setPrizes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  }

  function handleSubmitClick() {
    setCriteriaError(null);
    setPrizesError(null);
    startCriteriaTransition(async () => {
      // Save criteria if present
      if (criteria.length > 0) {
        const criteriaResult = await onSaveCriteria(criteria);
        if (criteriaResult.error) {
          setCriteriaError(criteriaResult.error);
          return;
        }
      }
      // Save prizes if present
      if (prizes.length > 0) {
        const prizesResult = await onSavePrizes(prizes);
        if (prizesResult.error) {
          setPrizesError(prizesResult.error);
          return;
        }
      }
      formRef.current?.requestSubmit();
    });
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-8">
      {state?.error && (
        <div className="rounded-lg border border-red-700/50 bg-red-900/30 p-4">
          <p className="text-sm text-red-300">{state.error}</p>
        </div>
      )}

      {/* ── Basic info ── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Basic Info</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium text-slate-300">Title *</label>
            <Input name="title" defaultValue={defaultValues?.title ?? ""} required
              className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
              placeholder="AI for Healthcare" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">Slug *</label>
            <Input name="slug" defaultValue={defaultValues?.slug ?? ""} required
              className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
              placeholder="ai-for-healthcare" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">Status</label>
            <select name="status" defaultValue={defaultValues?.status ?? "draft"}
              className="h-10 w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="draft">Draft</option>
              {!isAdmin && (criteria.length === 0 || prizes.length === 0) ? null : (
                <option value="published">Published</option>
              )}
              <option value="archived">Archived</option>
            </select>
            {!isAdmin && (criteria.length === 0 || prizes.length === 0) && (
              <p className="text-xs text-amber-400 mt-1">
                {criteria.length === 0 && prizes.length === 0
                  ? "Add at least one prize and one judging criterion to publish"
                  : criteria.length === 0
                  ? "Add at least one judging criterion to publish"
                  : "Add at least one prize to publish"}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">Max Teams</label>
            <Input name="maxTeams" type="number" defaultValue={defaultValues?.maxTeams ?? ""}
              className="border-slate-600 bg-slate-700/50 text-white" placeholder="10" />
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Content</h2>
        <div className="space-y-4">
          {(["description", "problemStatement", "expectedSolution", "techRequirements"] as const).map((field) => (
            <div key={field} className="space-y-1">
              <label className="text-sm font-medium text-slate-300">
                {field === "description" ? "Overview" :
                 field === "problemStatement" ? "Problem Statement" :
                 field === "expectedSolution" ? "Expected Solution" : "Tech Requirements"}
              </label>
              <textarea
                name={field}
                defaultValue={(defaultValues?.[field] as string) ?? ""}
                rows={4}
                className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}

        </div>
      </section>

      {/* ── Judging Criteria ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Judging Criteria</h2>
          <span className={`text-sm font-semibold ${totalWeight === 100 ? "text-green-400" : "text-yellow-400"}`}>
            {totalWeight}/100%
          </span>
        </div>

        {criteriaError && (
          <div className="mb-4 rounded-lg border border-red-700/50 bg-red-900/30 p-3">
            <p className="text-sm text-red-300">{criteriaError}</p>
          </div>
        )}

        <div className="space-y-3">
          {criteria.map((c, i) => (
            <div key={c.id} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Criterion {i + 1}</span>
                <button type="button" onClick={() => removeCriterion(c.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs text-slate-400">Name *</label>
                  <Input value={c.name} onChange={(e) => updateCriterion(c.id, "name", e.target.value)}
                    placeholder="Innovation" required
                    className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Weight %</label>
                    <Input type="number" min={1} max={100}
                      value={c.weight}
                      onChange={(e) => updateCriterion(c.id, "weight", Number(e.target.value))}
                      className="border-slate-600 bg-slate-700/50 text-white text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Max Score</label>
                    <Input type="number" min={1} max={100}
                      value={c.maxScore}
                      onChange={(e) => updateCriterion(c.id, "maxScore", Number(e.target.value))}
                      className="border-slate-600 bg-slate-700/50 text-white text-sm" />
                  </div>
                </div>
                <div className="space-y-1 sm:col-span-3">
                  <label className="text-xs text-slate-400">Description</label>
                  <Input value={c.description}
                    onChange={(e) => updateCriterion(c.id, "description", e.target.value)}
                    placeholder="What should the jury evaluate..."
                    className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500 text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" onClick={addCriterion}
          className="mt-3 border-dashed border-slate-600 text-slate-400 hover:text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Criterion
        </Button>
      </section>

      {/* ── Prizes ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Prizes</h2>
        </div>

        {prizesError && (
          <div className="mb-4 rounded-lg border border-red-700/50 bg-red-900/30 p-3">
            <p className="text-sm text-red-300">{prizesError}</p>
          </div>
        )}

        <div className="space-y-3">
          {prizes.map((p, i) => (
            <div key={p.id} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Prize {i + 1}</span>
                <button type="button" onClick={() => removePrize(p.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Place *</label>
                  <Input
                    value={p.place}
                    onChange={(e) => updatePrize(p.id, "place", e.target.value)}
                    placeholder="1st"
                    required
                    className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500 text-sm"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs text-slate-400">Value (EUR) *</label>
                  <div className="relative">
                    <Input
                      value={p.value}
                      onChange={(e) => updatePrize(p.id, "value", e.target.value)}
                      placeholder="5000"
                      required
                      className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500 text-sm pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">EUR</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Type</label>
                  <select
                    value={p.type}
                    onChange={(e) => updatePrize(p.id, "type", e.target.value)}
                    className="h-10 w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="voucher">Voucher</option>
                    <option value="product">Product</option>
                    <option value="service">Service</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400"># Teams</label>
                  <Input
                    type="number"
                    min={1}
                    value={p.numTeams}
                    onChange={(e) => updatePrize(p.id, "numTeams", Number(e.target.value))}
                    className="border-slate-600 bg-slate-700/50 text-white text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" onClick={addPrize}
          className="mt-3 border-dashed border-slate-600 text-slate-400 hover:text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Prize
        </Button>
      </section>

      <div className="flex gap-3 border-t border-slate-700 pt-4">
        <Button type="button" onClick={handleSubmitClick} disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
          {isPending ? "Saving..." : submitLabel}
        </Button>
        <Button type="button" variant="outline" className="border-slate-500 bg-slate-800 text-white hover:bg-slate-700 hover:text-white"
          onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
