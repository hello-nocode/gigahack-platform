"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MentorProfileFormState } from "@/lib/actions/mentors";
import type { MentorProfile } from "@db/schema";

interface MentorProfileFormProps {
  action: (prev: MentorProfileFormState, formData: FormData) => Promise<MentorProfileFormState>;
  defaultValues?: Partial<MentorProfile>;
  redirectTo?: string;
}

export function MentorProfileForm({ action, defaultValues, redirectTo }: MentorProfileFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<MentorProfileFormState, FormData>(
    action,
    null as unknown as MentorProfileFormState,
  );

  useEffect(() => {
    if (state?.success && redirectTo) {
      router.push(redirectTo as Route);
    }
  }, [state, router, redirectTo]);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && <div className="gh-banner-error">{state.error}</div>}
      {state?.success && <div className="gh-banner-success">Profile saved successfully.</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="gh-label">First Name</label>
          <Input name="firstName" defaultValue={defaultValues?.firstName ?? ""} required />
        </div>
        <div>
          <label className="gh-label">Last Name</label>
          <Input name="lastName" defaultValue={defaultValues?.lastName ?? ""} required />
        </div>

        <div className="sm:col-span-2">
          <label className="gh-label">Company / Organisation</label>
          <Input name="company" defaultValue={defaultValues?.company ?? ""} placeholder="Acme Corp" />
        </div>

        <div className="sm:col-span-2">
          <label className="gh-label">Areas of Expertise</label>
          <Input name="expertise" defaultValue={defaultValues?.expertise ?? ""} placeholder="e.g. Product Management, AI/ML, Go-to-market" />
          <p style={{ marginTop: "4px", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>Comma-separated topics or skills</p>
        </div>

        <div className="sm:col-span-2">
          <label className="gh-label">Bio</label>
          <textarea name="bio" rows={4} maxLength={2000} defaultValue={defaultValues?.bio ?? ""}
            placeholder="Tell teams about your background and how you can help…" className="gh-textarea" />
        </div>

        <div>
          <label className="gh-label">LinkedIn URL</label>
          <Input name="linkedinUrl" type="url" defaultValue={defaultValues?.linkedinUrl ?? ""} placeholder="https://linkedin.com/in/yourprofile" />
        </div>

        <div>
          <label className="gh-label">Avatar URL</label>
          <Input name="avatarUrl" type="url" defaultValue={defaultValues?.avatarUrl ?? ""} placeholder="https://example.com/photo.jpg" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save Profile"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
