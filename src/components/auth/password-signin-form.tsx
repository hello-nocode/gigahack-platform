"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordSignInForm({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const email = (formEl.elements.namedItem("email") as HTMLInputElement)?.value ?? "";
    const password = (formEl.elements.namedItem("password") as HTMLInputElement)?.value ?? "";

    setLoading(true);
    try {
      const res = await fetch("/api/auth/csrf");
      const { csrfToken } = (await res.json()) as { csrfToken: string };

      // POST directly to the NextAuth credentials callback. The browser follows
      // the 302 redirect and the session cookie is set natively (Auth.js v5 does
      // not reliably set cookies when signIn() is called from a server action).
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/auth/callback/credentials";

      const fields: Record<string, string> = {
        csrfToken,
        email,
        password,
        callbackUrl,
      };
      for (const [name, value] of Object.entries(fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } catch {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
