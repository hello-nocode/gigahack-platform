"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordSignInForm({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
  // Native top-level form POST to our own /api/login route. This avoids the
  // next-auth/react signIn() XHR + CSRF-cookie flow, which privacy-aggressive
  // browsers (Edge Tracking Prevention / InPrivate) block, causing MissingCSRF.
  return (
    <form method="post" action="/api/login" className="space-y-4">
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

      <Button type="submit" className="w-full" size="lg">
        Sign In →
      </Button>
      <p className="text-center text-xs" style={{ color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
        <Link href="/forgot-password" style={{ color: "var(--green)" }}>
          Forgot password?
        </Link>
      </p>
    </form>
  );
}
