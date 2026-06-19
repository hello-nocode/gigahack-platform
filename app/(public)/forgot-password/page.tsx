"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";
import type { RequestPasswordResetState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState<RequestPasswordResetState, FormData>(
    requestPasswordReset,
    null as unknown as RequestPasswordResetState,
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
            Reset your password.
          </p>
        </div>

        <div style={{ background: "var(--ink-800)", border: "1px solid var(--line-2)", padding: "28px 24px" }}>
          <p className="gh-kicker mb-5">» Forgot password</p>

          {state?.success ? (
            <div style={{ marginBottom: "16px", padding: "12px 14px", background: "var(--green-veil)", border: "1px solid var(--green)", fontSize: "13px", color: "var(--green)" }}>
              ✓ {state.message}
            </div>
          ) : (
            <>
              {state?.error && (
                <div style={{ marginBottom: "16px", padding: "12px 14px", background: "rgba(255,77,77,0.08)", border: "1px solid var(--danger)", fontSize: "13px", color: "var(--danger)" }}>
                  {state.error}
                </div>
              )}

              <form action={formAction} className="space-y-4">
                <div>
                  <label htmlFor="email" style={labelStyle}>Email</label>
                  <Input id="email" name="email" type="email" placeholder="ana@team.dev" required autoComplete="email" />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                  {isPending ? "Sending..." : "Send Reset Link →"}
                </Button>
                <p className="text-center text-xs" style={{ color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
                  We&apos;ll email you a link to choose a new password
                </p>
              </form>
            </>
          )}
        </div>

        <p style={{ marginTop: "16px", textAlign: "center", fontSize: "13px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
          Remembered it?{" "}
          <Link href="/login" style={{ color: "var(--green)" }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
