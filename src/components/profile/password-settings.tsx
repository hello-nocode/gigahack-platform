"use client";

import { useActionState } from "react";
import { setPassword, hasPassword } from "@/lib/actions/auth";
import type { SetPasswordState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, LockOpen } from "lucide-react";

interface PasswordSettingsProps {
  userId: string;
  hasPassword: boolean;
}

export function PasswordSettings({ userId, hasPassword: initialHasPassword }: PasswordSettingsProps) {
  const [state, formAction, isPending] = useActionState<SetPasswordState, FormData>(
    async (_prevState, formData) => setPassword(userId, _prevState, formData),
    null as unknown as SetPasswordState,
  );

  return (
    <div className="mt-6 p-6" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <p className="gh-kicker mb-4" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {initialHasPassword ? <Lock style={{ width: 13, height: 13 }} /> : <LockOpen style={{ width: 13, height: 13 }} />}
        {initialHasPassword ? "Change Password" : "Set Password"}
      </p>

      {state?.success && (
        <div style={{ marginBottom: "16px", padding: "12px 14px", background: "var(--green-veil)", border: "1px solid var(--green)", fontSize: "13px", color: "var(--green)" }}>
          ✓ {state.message}
        </div>
      )}

      {state?.error && (
        <div style={{ marginBottom: "16px", padding: "12px 14px", background: "rgba(255,77,77,0.08)", border: "1px solid var(--danger)", fontSize: "13px", color: "var(--danger)" }}>
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {initialHasPassword && (
          <div>
            <label
              htmlFor="currentPassword"
              style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: "6px" }}
            >
              Current Password
            </label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              placeholder="••••••••"
              required={initialHasPassword}
              autoComplete="current-password"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="newPassword"
            style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: "6px" }}
          >
            {initialHasPassword ? "New Password" : "Password"}
          </label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete={initialHasPassword ? "new-password" : "new-password"}
          />
          <p className="mt-1 text-xs" style={{ color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
            Minimum 8 characters
          </p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: "6px" }}
          >
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : initialHasPassword ? "Update Password" : "Set Password"}
        </Button>
      </form>

      <div className="mt-4" style={{ padding: "12px", background: "var(--ink-900)", borderRadius: "4px" }}>
        <p className="text-xs" style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
          {initialHasPassword
            ? "You can sign in with your password or Google OAuth."
            : "Set a password to sign in without Google or magic link."}
        </p>
      </div>
    </div>
  );
}
