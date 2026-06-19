"use client";

import { useState, useTransition } from "react";
import { verifyAndClaimTicket } from "@/lib/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Ticket, AlertCircle } from "lucide-react";

interface TicketVerificationProps {
  eventId: string;
  onVerified?: () => void;
}

export function TicketVerification({ eventId, onVerified }: TicketVerificationProps) {
  const [ticketNumber, setTicketNumber] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketNumber.trim()) return;

    setResult(null);
    startTransition(async () => {
      try {
        const res = await verifyAndClaimTicket(eventId, ticketNumber.trim());
        const resultWithMessage = res.success 
          ? { success: true, message: "Ticket verified successfully! You can now join or create a team." }
          : { success: false, message: res.error };
        setResult(resultWithMessage);
        if (res.success && onVerified) {
          onVerified();
        }
      } catch {
        setResult({ success: false, message: "Something went wrong. Please try again." });
      }
    });
  }

  return (
    <div className="gh-card p-6">
      <div className="mb-4 flex items-center gap-3">
        <Ticket className="h-6 w-6" style={{ color: "var(--green)" }} />
        <h2 style={{ fontWeight: 600, fontSize: "18px" }}>Verify Your Ticket</h2>
      </div>

      <p style={{ fontSize: "14px", color: "var(--fg-2)", marginBottom: "16px" }}>
        Please enter the ticket number you received from the external ticketing platform.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="gh-label">Ticket Number *</label>
          <Input
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value)}
            placeholder="e.g. GH-2024-12345"
            maxLength={50}
            disabled={isPending}
          />
        </div>

        {result && (
          <div
            className="flex items-start gap-2 rounded p-3"
            style={{
              background: result.success ? "rgba(0,233,5,0.1)" : "rgba(220,50,50,0.1)",
              border: `1px solid ${result.success ? "var(--green)" : "var(--danger)"}`,
            }}
          >
            {result.success ? (
              <Check className="h-5 w-5 shrink-0" style={{ color: "var(--green)" }} />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" style={{ color: "var(--danger)" }} />
            )}
            <p
              style={{
                fontSize: "13px",
                color: result.success ? "var(--fg-1)" : "var(--danger)",
              }}
            >
              {result.message}
            </p>
          </div>
        )}

        <Button type="submit" disabled={isPending || !ticketNumber.trim()}>
          {isPending ? "Verifying..." : "Verify Ticket"}
        </Button>
      </form>
    </div>
  );
}
