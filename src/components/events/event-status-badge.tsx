const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  registration_open: "Registration Open",
  applications_open: "Applications Open",
  in_progress: "In Progress",
  judging: "Judging",
  completed: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-700 text-slate-300",
  registration_open: "bg-blue-900/60 text-blue-300",
  applications_open: "bg-violet-900/60 text-violet-300",
  in_progress: "bg-green-900/60 text-green-300",
  judging: "bg-yellow-900/60 text-yellow-300",
  completed: "bg-slate-600 text-slate-400",
};

export function EventStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-slate-700 text-slate-300"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
