"use client";

import { useActionState, Suspense } from "react";
import { signInWithEmail } from "@/lib/actions/auth";
import type { SignInEmailState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";


function LoginForm() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verify") === "1";
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [state, formAction, isPending] = useActionState<SignInEmailState, FormData>(
    signInWithEmail,
    null as unknown as SignInEmailState,
  );

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--ink-900)" }}
    >
      {/* subtle green radial glow top-right */}
      <div
        aria-hidden
        style={{
          position: "fixed", top: 0, right: 0, width: "480px", height: "480px",
          background: "radial-gradient(ellipse at top right, rgba(0,233,5,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="w-full max-w-sm relative">
        {/* Brand */}
        <div className="mb-8">
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.12em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: "4px" }}>
            Deeptech
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "36px", letterSpacing: "-0.02em", color: "var(--fg-1)", lineHeight: 1 }}>
            GigaHack<span style={{ color: "var(--green)" }} className="gh-cursor" />
          </h1>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "var(--fg-3)" }}>
            Empowering great minds — 25–27 Sep 2026, Tekwill.
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "var(--ink-800)", border: "1px solid var(--line-2)", padding: "28px 24px" }}>
          <p className="gh-kicker mb-5">» Participant access</p>

          {(verified || state?.success) && (
            <div style={{ marginBottom: "20px", padding: "12px 14px", background: "var(--green-veil)", border: "1px solid var(--green)", fontSize: "13px", color: "var(--green)" }}>
              ✓ Magic link sent — check your email.
            </div>
          )}

          {state?.error && (
            <div style={{ marginBottom: "16px", padding: "12px 14px", background: "rgba(255,77,77,0.08)", border: "1px solid var(--danger)", fontSize: "13px", color: "var(--danger)" }}>
              {state.error}
            </div>
          )}

          {/* Google OAuth */}
          <GoogleSignInButton callbackUrl={callbackUrl} />

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div style={{ height: "1px", flex: 1, background: "var(--line)" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--fg-faint)", letterSpacing: "0.04em" }}>or email</span>
            <div style={{ height: "1px", flex: 1, background: "var(--line)" }} />
          </div>

          {/* Magic link form */}
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <div>
              <label
                htmlFor="email"
                style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: "6px" }}
              >
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ana@team.dev"
                required
                autoComplete="email"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isPending}>
              {isPending ? "Sending..." : "Enter GigaHack_ →"}
            </Button>
          </form>
        </div>

        <p style={{ marginTop: "16px", textAlign: "center", fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
          No team yet? You&apos;ll be matched after you enter.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
