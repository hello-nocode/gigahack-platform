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
      {state?.error && <div className="gh-banner-error">{state.error}</div>}

      <div>
        <label className="gh-label">Company Name *</label>
        <Input name="companyName" defaultValue={defaultValues?.companyName ?? ""} required placeholder="Acme Corp" />
      </div>

      <div>
        <label className="gh-label">Website</label>
        <Input name="website" type="url" defaultValue={defaultValues?.website ?? ""} placeholder="https://example.com" />
      </div>

      <div>
        <label className="gh-label">Logo URL</label>
        <Input name="logoUrl" type="url" defaultValue={defaultValues?.logoUrl ?? ""} placeholder="https://example.com/logo.png" />
      </div>

      <div>
        <label className="gh-label">Description</label>
        <textarea name="description" defaultValue={defaultValues?.description ?? ""} rows={4}
          placeholder="Brief description of your company..." className="gh-textarea" />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save Profile"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
