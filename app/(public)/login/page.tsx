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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <span className="text-2xl font-black text-white">G</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Gigahack</h1>
          <p className="mt-1 text-sm text-slate-400">Deeptech Hackathon Moldova</p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-8 shadow-2xl backdrop-blur-sm">
          <h2 className="mb-1 text-xl font-semibold text-white">Welcome!</h2>
          <p className="mb-6 text-sm text-slate-400">Sign in to continue</p>

          {verified && (
            <div className="mb-6 rounded-lg border border-blue-700/50 bg-blue-900/30 p-4">
              <p className="text-sm text-blue-300">
                ✓ Magic link sent! Check your email.
              </p>
            </div>
          )}

          {state?.success && !verified && (
            <div className="mb-6 rounded-lg border border-green-700/50 bg-green-900/30 p-4">
              <p className="text-sm text-green-300">
                ✓ Magic link sent! Check your email.
              </p>
            </div>
          )}

          {/* Google OAuth */}
          <GoogleSignInButton callbackUrl={callbackUrl} />

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-700" />
            <span className="text-xs text-slate-500">or continue with email</span>
            <div className="h-px flex-1 bg-slate-700" />
          </div>

          {/* Magic link form */}
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
              />
            </div>

            {state?.error && (
              <p className="text-sm text-red-400" role="alert">
                {state.error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
              disabled={isPending}
            >
              {isPending ? "Sending..." : "Send magic link"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            You will receive an email with a sign-in link valid for 24 hours.
          </p>
        </div>
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
