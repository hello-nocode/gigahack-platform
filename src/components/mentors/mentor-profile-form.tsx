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
      {state?.error && (
        <div className="rounded-lg border border-red-700/50 bg-red-900/30 p-4">
          <p className="text-sm text-red-300">{state.error}</p>
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg border border-green-700/50 bg-green-900/30 p-4">
          <p className="text-sm text-green-300">Profile saved successfully.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">First Name</label>
          <Input
            name="firstName"
            defaultValue={defaultValues?.firstName ?? ""}
            required
            className="border-slate-600 bg-slate-700/50 text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Last Name</label>
          <Input
            name="lastName"
            defaultValue={defaultValues?.lastName ?? ""}
            required
            className="border-slate-600 bg-slate-700/50 text-white"
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium text-slate-300">Company / Organisation</label>
          <Input
            name="company"
            defaultValue={defaultValues?.company ?? ""}
            placeholder="Acme Corp"
            className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium text-slate-300">Areas of Expertise</label>
          <Input
            name="expertise"
            defaultValue={defaultValues?.expertise ?? ""}
            placeholder="e.g. Product Management, AI/ML, Go-to-market"
            className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500">Comma-separated topics or skills</p>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium text-slate-300">Bio</label>
          <textarea
            name="bio"
            rows={4}
            maxLength={2000}
            defaultValue={defaultValues?.bio ?? ""}
            placeholder="Tell teams about your background and how you can help…"
            className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">LinkedIn URL</label>
          <Input
            name="linkedinUrl"
            type="url"
            defaultValue={defaultValues?.linkedinUrl ?? ""}
            placeholder="https://linkedin.com/in/yourprofile"
            className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Avatar URL</label>
          <Input
            name="avatarUrl"
            type="url"
            defaultValue={defaultValues?.avatarUrl ?? ""}
            placeholder="https://example.com/photo.jpg"
            className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
          {isPending ? "Saving…" : "Save Profile"}
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
