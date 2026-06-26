"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { reviewJoinRequest, type getJoinRequestsForTeam } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, ChevronRight, Mail, Phone, GraduationCap, Briefcase, Sparkles, Linkedin, FileText, User } from "lucide-react";

type JoinRequest = Awaited<ReturnType<typeof getJoinRequestsForTeam>>[number];

function displayName(r: JoinRequest): string {
  if (r.firstName && r.lastName) return `${r.firstName} ${r.lastName}`;
  return r.name ?? r.email ?? "Unknown";
}

const GENDER_LABEL: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

export function JoinRequestsPanel({ requests }: { requests: JoinRequest[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<JoinRequest | null>(null);
  const [loading, setLoading] = useState<null | "accepted" | "rejected">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, loading]);

  function close() {
    setSelected(null);
    setError(null);
  }

  async function review(decision: "accepted" | "rejected") {
    if (!selected) return;
    setError(null);
    setLoading(decision);
    const res = await reviewJoinRequest(selected.id, decision);
    setLoading(null);
    if (res?.error) {
      setError(res.error);
      return;
    }
    close();
    router.refresh();
  }

  if (requests.length === 0) return null;

  return (
    <div className="mt-4 p-6" style={{ background: "rgba(232,229,83,0.06)", border: "1px solid var(--warn)" }}>
      <p className="gh-kicker mb-4" style={{ color: "var(--warn)" }}>» Join Requests ({requests.length})</p>
      <div className="space-y-2">
        {requests.map((req) => {
          const name = displayName(req);
          const avatar = req.avatarUrl ?? req.image;
          return (
            <button
              key={req.id}
              type="button"
              onClick={() => { setSelected(req); setError(null); }}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer" }}
            >
              <div className="flex items-center gap-3">
                {avatar ? (
                  <img src={avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink-650)", fontSize: "12px", fontWeight: 600, borderRadius: "50%" }}>
                    {name[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 500 }}>{name}</p>
                  <p style={{ fontSize: "12px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{req.email}</p>
                </div>
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-faint)" }}>
                View <ChevronRight style={{ width: 14, height: 14 }} />
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <RequestModal
          req={selected}
          loading={loading}
          error={error}
          onClose={() => { if (!loading) close(); }}
          onReview={review}
        />
      )}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span style={{ color: "var(--fg-faint)", marginTop: "2px", flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-faint)" }}>{label}</p>
        <p style={{ fontSize: "14px", color: "var(--fg-2)", marginTop: "1px", wordBreak: "break-word" }}>{value}</p>
      </div>
    </div>
  );
}

function RequestModal({
  req,
  loading,
  error,
  onClose,
  onReview,
}: {
  req: JoinRequest;
  loading: null | "accepted" | "rejected";
  error: string | null;
  onClose: () => void;
  onReview: (decision: "accepted" | "rejected") => void;
}) {
  const name = displayName(req);
  const avatar = req.avatarUrl ?? req.image;
  const busy = loading !== null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: "100%", maxWidth: "30rem", maxHeight: "90vh", overflowY: "auto",
          background: "var(--surface-1, var(--surface-2))", border: "1px solid var(--border-strong, var(--border))",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5" style={{ borderBottom: "1px solid var(--line, var(--border))" }}>
          <div className="flex items-center gap-3">
            {avatar ? (
              <img src={avatar} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink-650)", fontSize: "18px", fontWeight: 700, borderRadius: "50%" }}>
                {name[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p style={{ fontSize: "18px", fontWeight: 600, fontFamily: "var(--font-display)" }}>{name}</p>
              <p style={{ fontSize: "12px", color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{req.email}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} style={{ color: "var(--fg-faint)", cursor: busy ? "default" : "pointer", flexShrink: 0 }} aria-label="Close">
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Details */}
        <div className="space-y-3 p-5">
          <DetailRow icon={<Mail style={{ width: 15, height: 15 }} />} label="Email" value={req.email ?? "—"} />
          {req.phone && <DetailRow icon={<Phone style={{ width: 15, height: 15 }} />} label="Phone" value={req.phone} />}
          {req.gender && <DetailRow icon={<User style={{ width: 15, height: 15 }} />} label="Gender" value={GENDER_LABEL[req.gender] ?? req.gender} />}
          {req.university && <DetailRow icon={<GraduationCap style={{ width: 15, height: 15 }} />} label="University" value={req.university} />}
          {req.jobTitle && <DetailRow icon={<Briefcase style={{ width: 15, height: 15 }} />} label="Job title" value={req.jobTitle} />}
          {req.expertiseDomain && <DetailRow icon={<Sparkles style={{ width: 15, height: 15 }} />} label="Expertise" value={req.expertiseDomain} />}

          {(req.linkedin || req.cvUrl) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {req.linkedin && (
                <a href={req.linkedin} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "13px", fontFamily: "var(--font-mono)", color: "var(--info)", background: "rgba(61,165,255,0.08)", border: "1px solid rgba(61,165,255,0.25)" }}>
                  <Linkedin style={{ width: 14, height: 14 }} /> LinkedIn
                </a>
              )}
              {req.cvUrl && (
                <a href={req.cvUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "13px", fontFamily: "var(--font-mono)", color: "var(--green)", background: "var(--green-veil)", border: "1px solid var(--green)" }}>
                  <FileText style={{ width: 14, height: 14 }} /> View CV
                </a>
              )}
            </div>
          )}

          {req.message && (
            <div style={{ marginTop: "4px", paddingTop: "12px", borderTop: "1px solid var(--line, var(--border))" }}>
              <p style={{ fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-faint)" }}>Request message</p>
              <p style={{ fontSize: "14px", color: "var(--fg-2)", marginTop: "4px", whiteSpace: "pre-wrap" }}>{req.message}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5" style={{ borderTop: "1px solid var(--line, var(--border))" }}>
          {error && (
            <p style={{ marginBottom: "10px", fontSize: "13px", color: "var(--danger)" }}>{error}</p>
          )}
          <div className="flex gap-2">
            <Button type="button" className="flex-1" disabled={busy} onClick={() => onReview("accepted")}>
              {loading === "accepted" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
              Accept
            </Button>
            <Button type="button" variant="destructive" className="flex-1" disabled={busy} onClick={() => onReview("rejected")}>
              {loading === "rejected" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <X className="mr-1 h-4 w-4" />}
              Reject
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
