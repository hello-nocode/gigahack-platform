"use client";

import { useActionState, Suspense, useState } from "react";
import Link from "next/link";
import { signInWithEmail, signInWithPassword } from "@/lib/actions/auth";
import type { SignInEmailState, SignInPasswordState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";


type AuthMethod = "magic" | "password";

function LoginForm() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verify") === "1";
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [authMethod, setAuthMethod] = useState<AuthMethod>("magic");

  const [magicState, magicAction, magicPending] = useActionState<SignInEmailState, FormData>(
    signInWithEmail,
    null as unknown as SignInEmailState,
  );

  const [passwordState, passwordAction, passwordPending] = useActionState<SignInPasswordState, FormData>(
    signInWithPassword,
    null as unknown as SignInPasswordState,
  );

  const state = authMethod === "magic" ? magicState : passwordState;

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

          {/* Auth method tabs */}
          <div className="mb-5 flex items-center gap-1" style={{ background: "var(--ink-900)", padding: "4px", borderRadius: "6px" }}>
            <button
              type="button"
              onClick={() => setAuthMethod("magic")}
              className="flex-1 py-2 px-3 text-center text-xs transition-colors"
              style={{
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.04em",
                background: authMethod === "magic" ? "var(--ink-800)" : "transparent",
                color: authMethod === "magic" ? "var(--fg-1)" : "var(--fg-3)",
                border: authMethod === "magic" ? "1px solid var(--line-2)" : "1px solid transparent",
                borderRadius: "4px",
              }}
            >
              Magic Link
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod("password")}
              className="flex-1 py-2 px-3 text-center text-xs transition-colors"
              style={{
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.04em",
                background: authMethod === "password" ? "var(--ink-800)" : "transparent",
                color: authMethod === "password" ? "var(--fg-1)" : "var(--fg-3)",
                border: authMethod === "password" ? "1px solid var(--line-2)" : "1px solid transparent",
                borderRadius: "4px",
              }}
            >
              Password
            </button>
          </div>

          {/* Magic link form */}
          {authMethod === "magic" && (
            <form action={magicAction} className="space-y-4">
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <div>
                <label
                  htmlFor="magic-email"
                  style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: "6px" }}
                >
                  Email
                </label>
                <Input
                  id="magic-email"
                  name="email"
                  type="email"
                  placeholder="ana@team.dev"
                  required
                  autoComplete="email"
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={magicPending}>
                {magicPending ? "Sending..." : "Send Magic Link →"}
              </Button>
              <p className="text-center text-xs" style={{ color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
                We&apos;ll email you a login link
              </p>
            </form>
          )}

          {/* Password form */}
          {authMethod === "password" && (
            <form action={passwordAction} className="space-y-4">
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <div>
                <label
                  htmlFor="password-email"
                  style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: "6px" }}
                >
                  Email
                </label>
                <Input
                  id="password-email"
                  name="email"
                  type="email"
                  placeholder="ana@team.dev"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: "6px" }}
                >
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={passwordPending}>
                {passwordPending ? "Signing in..." : "Sign In →"}
              </Button>
              <p className="text-center text-xs" style={{ color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
                Use the password you set in your profile
              </p>
            </form>
          )}
        </div>

        <p style={{ marginTop: "16px", textAlign: "center", fontSize: "13px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
          Don&apos;t have an account?{" "}
          <Link href={{ pathname: "/signup", query: { callbackUrl } }} style={{ color: "var(--green)" }}>
            Create one
          </Link>
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
