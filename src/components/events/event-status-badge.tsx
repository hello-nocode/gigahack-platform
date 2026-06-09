const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  registration_open: "Registration Open",
  applications_open: "Applications Open",
  in_progress: "In Progress",
  judging: "Judging",
  completed: "Completed",
};

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  draft:             { background: "var(--ink-650)", color: "var(--fg-3)" },
  registration_open: { background: "rgba(61,165,255,0.12)", color: "var(--info)", border: "1px solid rgba(61,165,255,0.3)" },
  applications_open: { background: "rgba(61,165,255,0.08)", color: "var(--fg-2)", border: "1px solid var(--line-2)" },
  in_progress:       { background: "var(--green-veil)", color: "var(--green)", border: "1px solid var(--green)" },
  judging:           { background: "rgba(232,229,83,0.10)", color: "var(--warn)", border: "1px solid rgba(232,229,83,0.3)" },
  completed:         { background: "var(--ink-700)", color: "var(--fg-faint)" },
};

export function EventStatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        ...(STATUS_STYLES[status] ?? { background: "var(--ink-650)", color: "var(--fg-3)" }),
      }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
