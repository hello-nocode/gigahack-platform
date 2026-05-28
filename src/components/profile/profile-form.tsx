"use client";

import { useActionState, useEffect, useState } from "react";
import { updateProfile } from "@/lib/actions/profile";
import type { ProfileState } from "@/lib/actions/profile";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

interface ProfileFormProps {
  defaultValues: {
    firstName?: string | null;
    lastName?: string | null;
    gender?: string | null;
    phone?: string | null;
    linkedin?: string | null;
    avatarUrl?: string | null;
    email: string;
  };
}

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState<ProfileState, FormData>(
    updateProfile,
    null as unknown as ProfileState,
  );
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(defaultValues.avatarUrl ?? "");

  useEffect(() => {
    if (state?.success) {
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-lg border border-red-700/50 bg-red-900/30 p-4">
          <p className="text-sm text-red-300">{state.error}</p>
        </div>
      )}

      {/* Name row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">First Name</label>
          <Input
            name="firstName"
            defaultValue={defaultValues.firstName ?? ""}
            maxLength={60}
            placeholder="Jane"
            className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Last Name</label>
          <Input
            name="lastName"
            defaultValue={defaultValues.lastName ?? ""}
            maxLength={60}
            placeholder="Doe"
            className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Email — read-only */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Email</label>
        <Input
          value={defaultValues.email}
          disabled
          className="border-slate-700 bg-slate-800 text-slate-400 cursor-not-allowed"
        />
        <p className="text-xs text-slate-500">Email is managed by your OAuth provider and cannot be changed here.</p>
      </div>

      {/* Gender */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Gender</label>
        <select
          name="gender"
          defaultValue={defaultValues.gender ?? ""}
          className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Prefer not to say</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer_not_to_say">Prefer not to say (explicit)</option>
        </select>
      </div>

      {/* Phone */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Phone</label>
        <Input
          name="phone"
          type="tel"
          defaultValue={defaultValues.phone ?? ""}
          maxLength={30}
          placeholder="+373 69 123 456"
          className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
        />
      </div>

      {/* LinkedIn */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">LinkedIn URL</label>
        <Input
          name="linkedin"
          type="url"
          defaultValue={defaultValues.linkedin ?? ""}
          placeholder="https://linkedin.com/in/yourname"
          className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Avatar upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Profile Picture</label>
        <AvatarUpload
          currentUrl={avatarUrl || defaultValues.avatarUrl}
          name="avatarUrl"
          onChange={setAvatarUrl}
        />
        <p className="text-xs text-slate-500">Overrides the picture from your Google account.</p>
      </div>

      <div className="flex items-center gap-3 border-t border-slate-700 pt-4">
        <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-400">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </form>
  );
}
