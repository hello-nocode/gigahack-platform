"use client";

import { useActionState, Suspense } from "react";
import Link from "next/link";
import { signUpWithPassword } from "@/lib/actions/auth";
import type { SignUpState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";

function SignUpForm() {
  const searchParams = useSearchParams();
  // Where to send the user after onboarding completes.
  const next = searchParams.get("callbackUrl");
  // New accounts always go through onboarding first; preserve the intended
  // destination via ?next= so the wizard can forward there when finished.
  const onboardingUrl = next
    ? `/onboarding?next=${encodeURIComponent(next)}`
    : "/onboarding";

  const [state, formAction, isPending] = useActionState<SignUpState, FormData>(
    signUpWithPassword,
    null as unknown as SignUpState,
  );

  const labelStyle = {
    display: "block",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "var(--fg-3)",
    marginBottom: "6px",
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "var(--ink-900)" }}
    >
      <div
        aria-hidden
        style={{
          position: "fixed", top: 0, right: 0, width: "480px", height: "480px",
          background: "radial-gradient(ellipse at top right, rgba(0,233,5,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="w-full max-w-md relative">
        {/* Brand */}
        <div className="mb-8">
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.12em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: "4px" }}>
            Deeptech
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "36px", letterSpacing: "-0.02em", color: "var(--fg-1)", lineHeight: 1 }}>
            GigaHack<span style={{ color: "var(--green)" }} className="gh-cursor" />
          </h1>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "var(--fg-3)" }}>
            Create your account to get started.
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "var(--ink-800)", border: "1px solid var(--line-2)", padding: "28px 24px" }}>
          <p className="gh-kicker mb-5">» New participant</p>

          {state?.error && (
            <div style={{ marginBottom: "16px", padding: "12px 14px", background: "rgba(255,77,77,0.08)", border: "1px solid var(--danger)", fontSize: "13px", color: "var(--danger)" }}>
              {state.error}
            </div>
          )}

          {/* Google OAuth */}
          <GoogleSignInButton callbackUrl={onboardingUrl} />

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div style={{ height: "1px", flex: 1, background: "var(--line)" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--fg-faint)", letterSpacing: "0.04em" }}>or sign up with email</span>
            <div style={{ height: "1px", flex: 1, background: "var(--line)" }} />
          </div>

          {/* Sign up form */}
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="callbackUrl" value={onboardingUrl} />

            <div>
              <label htmlFor="email" style={labelStyle}>Email</label>
              <Input id="email" name="email" type="email" placeholder="ana@team.dev" required autoComplete="email" />
            </div>

            <div>
              <label htmlFor="password" style={labelStyle}>Password</label>
              <Input id="password" name="password" type="password" placeholder="••••••••" required minLength={8} autoComplete="new-password" />
              <p className="mt-1 text-xs" style={{ color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>Minimum 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password</label>
              <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" required minLength={8} autoComplete="new-password" />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isPending}>
              {isPending ? "Creating account..." : "Create Account →"}
            </Button>
            <p className="text-center text-xs" style={{ color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
              You&apos;ll complete your profile in the next step.
            </p>
          </form>
        </div>

        <p style={{ marginTop: "16px", textAlign: "center", fontSize: "13px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
          Already have an account?{" "}
          <Link href={next ? { pathname: "/login", query: { callbackUrl: next } } : { pathname: "/login" }} style={{ color: "var(--green)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
