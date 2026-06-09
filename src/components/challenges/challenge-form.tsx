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
      {state?.error && <div className="gh-banner-error">{state.error}</div>}

      {/* ── Basic info ── */}
      <section>
        <p className="gh-kicker mb-4">» Basic Info</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="gh-label">Title *</label>
            <Input name="title" defaultValue={defaultValues?.title ?? ""} required placeholder="AI for Healthcare" />
          </div>
          <div>
            <label className="gh-label">Slug *</label>
            <Input name="slug" defaultValue={defaultValues?.slug ?? ""} required placeholder="ai-for-healthcare" />
          </div>
          <div>
            <label className="gh-label">Status</label>
            <select name="status" defaultValue={defaultValues?.status ?? "draft"} className="gh-select">
              <option value="draft">Draft</option>
              {!isAdmin && (criteria.length === 0 || prizes.length === 0) ? null : (
                <option value="published">Published</option>
              )}
              <option value="archived">Archived</option>
            </select>
            {!isAdmin && (criteria.length === 0 || prizes.length === 0) && (
              <p style={{ marginTop: "4px", fontSize: "12px", color: "var(--warn)", fontFamily: "var(--font-mono)" }}>
                {criteria.length === 0 && prizes.length === 0
                  ? "Add at least one prize and one judging criterion to publish"
                  : criteria.length === 0 ? "Add at least one judging criterion to publish"
                  : "Add at least one prize to publish"}
              </p>
            )}
          </div>
          <div>
            <label className="gh-label">Max Teams</label>
            <Input name="maxTeams" type="number" defaultValue={defaultValues?.maxTeams ?? ""} placeholder="10" />
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section>
        <p className="gh-kicker mb-4">» Content</p>
        <div className="space-y-4">
          {(["description", "problemStatement", "expectedSolution", "techRequirements"] as const).map((field) => (
            <div key={field}>
              <label className="gh-label">
                {field === "description" ? "Overview" :
                 field === "problemStatement" ? "Problem Statement" :
                 field === "expectedSolution" ? "Expected Solution" : "Tech Requirements"}
              </label>
              <textarea name={field} defaultValue={(defaultValues?.[field] as string) ?? ""} rows={4} className="gh-textarea" />
            </div>
          ))}
        </div>
      </section>

      {/* ── Judging Criteria ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <p className="gh-kicker" style={{ margin: 0 }}>» Judging Criteria</p>
          <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)", fontWeight: 600, color: totalWeight === 100 ? "var(--green)" : "var(--warn)" }}>
            {totalWeight}/100%
          </span>
        </div>
        {criteriaError && <div className="gh-banner-error mb-4">{criteriaError}</div>}
        <div className="space-y-3">
          {criteria.map((c, i) => (
            <div key={c.id} className="p-4" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
              <div className="mb-3 flex items-center justify-between">
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Criterion {i + 1}</span>
                <button type="button" onClick={() => removeCriterion(c.id)} style={{ color: "var(--fg-faint)" }} className="transition-colors hover:text-[var(--danger)]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="gh-label">Name *</label>
                  <Input value={c.name} onChange={(e) => updateCriterion(c.id, "name", e.target.value)} placeholder="Innovation" required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="gh-label">Weight %</label>
                    <Input type="number" min={1} max={100} value={c.weight} onChange={(e) => updateCriterion(c.id, "weight", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="gh-label">Max Score</label>
                    <Input type="number" min={1} max={100} value={c.maxScore} onChange={(e) => updateCriterion(c.id, "maxScore", Number(e.target.value))} />
                  </div>
                </div>
                <div className="sm:col-span-3">
                  <label className="gh-label">Description</label>
                  <Input value={c.description} onChange={(e) => updateCriterion(c.id, "description", e.target.value)} placeholder="What should the jury evaluate..." />
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" onClick={addCriterion} className="mt-3">
          <Plus className="mr-2 h-4 w-4" /> Add Criterion
        </Button>
      </section>

      {/* ── Prizes ── */}
      <section>
        <p className="gh-kicker mb-4">» Prizes</p>
        {prizesError && <div className="gh-banner-error mb-4">{prizesError}</div>}
        <div className="space-y-3">
          {prizes.map((p, i) => (
            <div key={p.id} className="p-4" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
              <div className="mb-3 flex items-center justify-between">
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Prize {i + 1}</span>
                <button type="button" onClick={() => removePrize(p.id)} style={{ color: "var(--fg-faint)" }} className="transition-colors hover:text-[var(--danger)]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="gh-label">Place *</label>
                  <Input value={p.place} onChange={(e) => updatePrize(p.id, "place", e.target.value)} placeholder="1st" required />
                </div>
                <div className="sm:col-span-2">
                  <label className="gh-label">Value (EUR) *</label>
                  <div className="relative">
                    <Input value={p.value} onChange={(e) => updatePrize(p.id, "value", e.target.value)} placeholder="5000" required className="pr-12" />
                    <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>EUR</span>
                  </div>
                </div>
                <div>
                  <label className="gh-label">Type</label>
                  <select value={p.type} onChange={(e) => updatePrize(p.id, "type", e.target.value)} className="gh-select">
                    <option value="cash">Cash</option>
                    <option value="voucher">Voucher</option>
                    <option value="product">Product</option>
                    <option value="service">Service</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="gh-label"># Teams</label>
                  <Input type="number" min={1} value={p.numTeams} onChange={(e) => updatePrize(p.id, "numTeams", Number(e.target.value))} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" onClick={addPrize} className="mt-3">
          <Plus className="mr-2 h-4 w-4" /> Add Prize
        </Button>
      </section>

      <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
        <Button type="button" onClick={handleSubmitClick} disabled={isPending}>{isPending ? "Saving..." : submitLabel}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
