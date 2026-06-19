"use client";

import { useActionState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/actions/auth";
import type { ResetPasswordState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const labelStyle = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "var(--fg-3)",
  marginBottom: "6px",
};

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [state, formAction, isPending] = useActionState<ResetPasswordState, FormData>(
    resetPassword,
    null as unknown as ResetPasswordState,
  );

  useEffect(() => {
    if (state?.success) {
      router.push("/login?reset=1");
    }
  }, [state, router]);

  const missingParams = !token || !email;

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--ink-900)" }}>
      <div
        aria-hidden
        style={{
          position: "fixed", top: 0, right: 0, width: "480px", height: "480px",
          background: "radial-gradient(ellipse at top right, rgba(0,233,5,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="w-full max-w-sm relative">
        <div className="mb-8">
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.12em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: "4px" }}>
            Deeptech
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "36px", letterSpacing: "-0.02em", color: "var(--fg-1)", lineHeight: 1 }}>
            GigaHack<span style={{ color: "var(--green)" }} className="gh-cursor" />
          </h1>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "var(--fg-3)" }}>
            Choose a new password.
          </p>
        </div>

        <div style={{ background: "var(--ink-800)", border: "1px solid var(--line-2)", padding: "28px 24px" }}>
          <p className="gh-kicker mb-5">» Reset password</p>

          {missingParams ? (
            <div style={{ fontSize: "13px", color: "var(--fg-3)" }}>
              <div style={{ marginBottom: "16px", padding: "12px 14px", background: "rgba(255,77,77,0.08)", border: "1px solid var(--danger)", color: "var(--danger)" }}>
                This reset link is invalid or incomplete.
              </div>
              <Link href="/forgot-password" style={{ color: "var(--green)" }}>
                Request a new reset link
              </Link>
            </div>
          ) : (
            <>
              {state?.error && (
                <div style={{ marginBottom: "16px", padding: "12px 14px", background: "rgba(255,77,77,0.08)", border: "1px solid var(--danger)", fontSize: "13px", color: "var(--danger)" }}>
                  {state.error}
                </div>
              )}

              <form action={formAction} className="space-y-4">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="email" value={email} />

                <div>
                  <label htmlFor="newPassword" style={labelStyle}>New Password</label>
                  <Input id="newPassword" name="newPassword" type="password" placeholder="••••••••" required minLength={8} autoComplete="new-password" />
                  <p className="mt-1 text-xs" style={{ color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>Minimum 8 characters</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password</label>
                  <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" required minLength={8} autoComplete="new-password" />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                  {isPending ? "Updating..." : "Update Password →"}
                </Button>
              </form>
            </>
          )}
        </div>

        <p style={{ marginTop: "16px", textAlign: "center", fontSize: "13px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
          <Link href="/login" style={{ color: "var(--green)" }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
