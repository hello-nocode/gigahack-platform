"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordSignInForm({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const email = (formEl.elements.namedItem("email") as HTMLInputElement)?.value ?? "";
    const password = (formEl.elements.namedItem("password") as HTMLInputElement)?.value ?? "";

    setError(null);
    setLoading(true);
    try {
      // next-auth/react signIn handles CSRF + secure cookies in all environments
      // (the server-action signIn() does not reliably set the session cookie).
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      // Full navigation so the freshly-set session cookie is picked up.
      window.location.assign(callbackUrl);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div style={{ padding: "12px 14px", background: "rgba(255,77,77,0.08)", border: "1px solid var(--danger)", fontSize: "13px", color: "var(--danger)" }}>
          {error}
        </div>
      )}
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

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Signing in..." : "Sign In →"}
      </Button>
      <p className="text-center text-xs" style={{ color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
        <Link href="/forgot-password" style={{ color: "var(--green)" }}>
          Forgot password?
        </Link>
      </p>
    </form>
  );
}
