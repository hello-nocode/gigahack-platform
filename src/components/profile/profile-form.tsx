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
    expertiseDomain?: string | null;
    university?: string | null;
    jobTitle?: string | null;
    cvUrl?: string | null;
    email: string;
  };
  requireAll?: boolean;
  onSuccess?: () => void;
  submitLabel?: string;
}

export function ProfileForm({ defaultValues, onSuccess, submitLabel }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState<ProfileState, FormData>(
    updateProfile,
    null as unknown as ProfileState,
  );
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(defaultValues.avatarUrl ?? "");

  useEffect(() => {
    if (state?.success) {
      setSaved(true);
      if (onSuccess) onSuccess();
      const t = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <div className="gh-banner-error">{state.error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="gh-label">First Name *</label>
          <Input name="firstName" defaultValue={defaultValues.firstName ?? ""} maxLength={60} placeholder="Jane" required />
        </div>
        <div>
          <label className="gh-label">Last Name *</label>
          <Input name="lastName" defaultValue={defaultValues.lastName ?? ""} maxLength={60} placeholder="Doe" required />
        </div>
      </div>

      <div>
        <label className="gh-label">Email</label>
        <Input value={defaultValues.email} disabled />
        <p style={{ marginTop: "4px", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>Managed by your OAuth provider — cannot be changed here.</p>
      </div>

      <div>
        <label className="gh-label">Gender</label>
        <select name="gender" defaultValue={defaultValues.gender ?? ""} className="gh-select">
          <option value="">Prefer not to say</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer_not_to_say">Prefer not to say (explicit)</option>
        </select>
      </div>

      <div>
        <label className="gh-label">Phone *</label>
        <Input name="phone" type="tel" defaultValue={defaultValues.phone ?? ""} maxLength={30} placeholder="+373 69 123 456" required />
      </div>

      <div>
        <label className="gh-label">Domain of Expertise *</label>
        <select name="expertiseDomain" defaultValue={defaultValues.expertiseDomain ?? ""} className="gh-select" required>
          <option value="">Select your expertise...</option>
          <option value="software_development">Software Development</option>
          <option value="ai_ml">AI / Machine Learning</option>
          <option value="data_science">Data Science</option>
          <option value="product_management">Product Management</option>
          <option value="design_ux">Design / UX</option>
          <option value="business_marketing">Business / Marketing</option>
          <option value="hardware_iot">Hardware / IoT</option>
          <option value="blockchain_web3">Blockchain / Web3</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="gh-label">University / Institution</label>
          <Input name="university" defaultValue={defaultValues.university ?? ""} maxLength={100} placeholder="e.g. MIT, Stanford" />
        </div>
        <div>
          <label className="gh-label">Job Title</label>
          <Input name="jobTitle" defaultValue={defaultValues.jobTitle ?? ""} maxLength={60} placeholder="e.g. Software Engineer" />
        </div>
      </div>

      <div>
        <label className="gh-label">LinkedIn URL</label>
        <Input name="linkedin" type="url" defaultValue={defaultValues.linkedin ?? ""} placeholder="https://linkedin.com/in/yourname" />
      </div>

      <div>
        <label className="gh-label">CV / Resume</label>
        <AvatarUpload currentUrl={defaultValues.cvUrl ?? ""} name="cvUrl" onChange={() => {}} />
        <p style={{ marginTop: "4px", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>PDF or Word document (optional)</p>
      </div>

      <div>
        <label className="gh-label">Profile Picture</label>
        <AvatarUpload currentUrl={avatarUrl || defaultValues.avatarUrl} name="avatarUrl" onChange={setAvatarUrl} />
        <p style={{ marginTop: "4px", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>Overrides the picture from your Google account.</p>
      </div>

      <div className="flex items-center gap-3 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
        <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : (submitLabel ?? "Save Changes")}</Button>
        {saved && (
          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "var(--green)", fontFamily: "var(--font-mono)" }}>
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </form>
  );
}
