"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProfileFormState } from "@/lib/actions/partners";
import type { PartnerProfile } from "@db/schema";

interface PartnerProfileFormProps {
  action: (prev: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
  defaultValues?: Partial<PartnerProfile>;
  redirectTo: string;
}

export function PartnerProfileForm({ action, defaultValues, redirectTo }: PartnerProfileFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ProfileFormState, FormData>(
    action,
    null as unknown as ProfileFormState,
  );

  useEffect(() => {
    if (state?.success) router.push(redirectTo as Route);
  }, [state, router, redirectTo]);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-lg border border-red-700/50 bg-red-900/30 p-4">
          <p className="text-sm text-red-300">{state.error}</p>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Company Name *</label>
        <Input
          name="companyName"
          defaultValue={defaultValues?.companyName ?? ""}
          required
          placeholder="Acme Corp"
          className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Website</label>
        <Input
          name="website"
          type="url"
          defaultValue={defaultValues?.website ?? ""}
          placeholder="https://example.com"
          className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Logo URL</label>
        <Input
          name="logoUrl"
          type="url"
          defaultValue={defaultValues?.logoUrl ?? ""}
          placeholder="https://example.com/logo.png"
          className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Description</label>
        <textarea
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          rows={4}
          placeholder="Brief description of your company..."
          className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
          {isPending ? "Saving..." : "Save Profile"}
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
