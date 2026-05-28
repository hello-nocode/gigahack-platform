"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { registerForEvent } from "@/lib/actions/registrations";
import type { RegistrationState } from "@/lib/actions/registrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, XCircle, ChevronDown, ChevronUp, Ticket } from "lucide-react";

interface RegisterButtonProps {
  eventId: string;
  eventSlug: string;
  redirectOnSuccess?: string;
  registration: {
    id: string;
    status: "pending" | "approved" | "rejected" | "withdrawn";
    ticketNumber?: string | null;
    motivation?: string | null;
    skills?: string | null;
    experience?: string | null;
  } | null;
}

export function RegisterButton({ eventId, eventSlug: _eventSlug, redirectOnSuccess, registration }: RegisterButtonProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(!registration || registration.status === "withdrawn");

  const action = registerForEvent.bind(null, eventId);
  const [state, formAction, isPending] = useActionState<RegistrationState, FormData>(
    action,
    null as unknown as RegistrationState,
  );

  useEffect(() => {
    if (state?.success) {
      if (redirectOnSuccess) {
        router.push(redirectOnSuccess as Route);
      } else {
        setShowForm(false);
      }
    }
  }, [state, redirectOnSuccess, router]);

  // Already approved — hide registration section completely
  if (registration?.status === "approved") {
    return null;
  }

  // Pending approval
  if (registration?.status === "pending" && !state?.success) {
    return (
      <div className="rounded-xl border border-yellow-700/40 bg-yellow-900/10 p-5">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-400" />
          <p className="font-semibold text-yellow-300">Registration pending review</p>
        </div>
      </div>
    );
  }

  // Rejected
  if (registration?.status === "rejected") {
    return (
      <div className="rounded-xl border border-red-700/40 bg-red-900/10 p-5 flex items-center gap-2">
        <XCircle className="h-5 w-5 text-red-400" />
        <p className="text-red-300">Your registration was not accepted.</p>
      </div>
    );
  }

  // Not registered / withdrawn — show form
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Register for this Event</h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {showForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {state?.error && (
        <div className="mb-4 rounded-lg border border-red-700/50 bg-red-900/30 p-3">
          <p className="text-sm text-red-300">{state.error}</p>
        </div>
      )}

      {showForm && (
        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5 text-blue-400" />
              Ticket Number <span className="text-red-400">*</span>
            </label>
            <Input
              name="ticketNumber"
              required
              placeholder="e.g. TKT-001"
              className="border-slate-600 bg-slate-700/50 font-mono text-white placeholder:text-slate-500 placeholder:font-sans"
            />
            <p className="text-xs text-slate-500">Enter the ticket number from your purchase confirmation.</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">
              Why do you want to participate? <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              name="motivation"
              rows={3}
              maxLength={1000}
              defaultValue={registration?.motivation ?? ""}
              placeholder="Share your motivation…"
              className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">
              Skills <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              name="skills"
              rows={2}
              maxLength={500}
              defaultValue={registration?.skills ?? ""}
              placeholder="e.g. React, Node.js, Python, Design…"
              className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">
              Previous hackathon experience <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              name="experience"
              rows={2}
              maxLength={500}
              defaultValue={registration?.experience ?? ""}
              placeholder="Describe any past experience…"
              className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" disabled={isPending} className="w-full bg-blue-600 hover:bg-blue-700">
            {isPending ? "Submitting…" : "Submit Registration"}
          </Button>
        </form>
      )}
    </div>
  );
}
