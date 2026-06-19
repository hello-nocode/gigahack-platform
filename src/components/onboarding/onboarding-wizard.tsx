"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { TicketVerification } from "@/components/tickets/ticket-verification";
import { Button } from "@/components/ui/button";
import { Check, User, Ticket } from "lucide-react";

type Step = "profile" | "ticket";

interface OnboardingWizardProps {
  startStep: Step;
  needsTicket: boolean;
  finalDestination: string;
  activeEvent: { id: string; title: string } | null;
  profileDefaults: {
    firstName?: string | null;
    lastName?: string | null;
    gender?: string | null;
    phone?: string | null;
    linkedin?: string | null;
    avatarUrl?: string | null;
    expertiseDomain?: string | null;
    university?: string | null;
    jobTitle?: string | null;
    cvUrl?: string | null;
    email: string;
  };
}

export function OnboardingWizard({
  startStep,
  needsTicket,
  finalDestination,
  activeEvent,
  profileDefaults,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(startStep);
  const [finishing, setFinishing] = useState(false);

  const steps: { key: Step; label: string; icon: typeof User }[] = [
    { key: "profile", label: "Your Profile", icon: User },
    ...(needsTicket ? [{ key: "ticket" as Step, label: "Verify Ticket", icon: Ticket }] : []),
  ];

  function finish() {
    setFinishing(true);
    router.push(finalDestination);
    router.refresh();
  }

  function handleProfileSuccess() {
    if (needsTicket) {
      setStep("ticket");
    } else {
      finish();
    }
  }

  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex min-h-screen items-start justify-center px-4 py-12" style={{ background: "var(--ink-900)" }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <p className="gh-kicker mb-2">» Welcome to GigaHack</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "30px", letterSpacing: "-0.02em", color: "var(--fg-1)" }}>
            Let&apos;s set up your account
          </h1>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "var(--fg-3)" }}>
            Just a couple of quick steps before you get started.
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex items-center gap-3">
          {steps.map((s, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div
                  className="flex items-center gap-2 px-3 py-2"
                  style={{
                    border: `1px solid ${active ? "var(--green)" : done ? "var(--green)" : "var(--border)"}`,
                    background: active ? "var(--green-veil)" : "transparent",
                    color: active || done ? "var(--green)" : "var(--fg-3)",
                  }}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)" }}>{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ width: "24px", height: "1px", background: "var(--border)" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        {step === "profile" && (
          <div className="gh-card p-8">
            <p className="gh-kicker mb-4">» Complete your profile</p>
            <ProfileForm
              defaultValues={profileDefaults}
              onSuccess={handleProfileSuccess}
              submitLabel={needsTicket ? "Save & Continue →" : "Save & Finish →"}
            />
          </div>
        )}

        {step === "ticket" && (
          <div>
            {activeEvent ? (
              <>
                <p className="gh-kicker mb-4">» {activeEvent.title}</p>
                <TicketVerification eventId={activeEvent.id} onVerified={finish} />
                <div className="mt-4 text-center">
                  <button
                    onClick={finish}
                    disabled={finishing}
                    style={{ fontSize: "13px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Skip for now
                  </button>
                </div>
              </>
            ) : (
              <div className="gh-card p-8 text-center">
                <p style={{ color: "var(--fg-3)" }}>No active event right now.</p>
                <Button className="mt-4" onClick={finish} disabled={finishing}>
                  Continue →
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
