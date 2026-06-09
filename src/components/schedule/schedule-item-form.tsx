"use client";

import { useState, useTransition } from "react";
import { createScheduleItem, updateScheduleItem } from "@/lib/actions/schedule";
import { Button } from "@/components/ui/button";
import { Pencil, Plus } from "lucide-react";
import type { EventScheduleItem } from "@db/schema";

type ScheduleType = "keynote" | "workshop" | "meal" | "deadline" | "other";

interface Props {
  eventId: string;
  item?: EventScheduleItem;
  editMode?: boolean;
}

function toDatetimeLocal(d: Date | null | undefined): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  fontSize: "13px",
  background: "var(--surface-3)",
  border: "1px solid var(--border)",
  color: "var(--fg-1)",
  outline: "none",
  fontFamily: "var(--font-ui)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontFamily: "var(--font-mono)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--fg-3)",
  marginBottom: "4px",
};

export function ScheduleItemForm({ eventId, item, editMode = false }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(item?.title ?? "");
  const [type, setType] = useState<ScheduleType>((item?.type as ScheduleType) ?? "other");
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(item?.startsAt));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(item?.endsAt));
  const [location, setLocation] = useState(item?.location ?? "");
  const [description, setDescription] = useState(item?.description ?? "");

  function reset() {
    if (!editMode) {
      setTitle("");
      setType("other");
      setStartsAt("");
      setEndsAt("");
      setLocation("");
      setDescription("");
    }
    setError(null);
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startsAt) {
      setError("Title and start time are required.");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const data = {
          title: title.trim(),
          type,
          startsAt: new Date(startsAt),
          endsAt: endsAt ? new Date(endsAt) : null,
          location: location.trim() || null,
          description: description.trim() || null,
        };

        if (editMode && item) {
          await updateScheduleItem(item.id, data);
        } else {
          await createScheduleItem(eventId, data);
        }
        reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  if (editMode && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Edit item"
        className="gh-btn-ghost flex h-8 w-8 items-center justify-center transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (editMode && open) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setOpen(false)} />
        <div style={{ position: "relative", zIndex: 51, background: "var(--ink-800)", border: "1px solid var(--border-strong)", padding: "24px", width: "100%", maxWidth: "480px", margin: "0 16px" }}>
          <p className="gh-kicker mb-4">» Edit Schedule Item</p>
          <FormFields
            title={title} setTitle={setTitle}
            type={type} setType={setType}
            startsAt={startsAt} setStartsAt={setStartsAt}
            endsAt={endsAt} setEndsAt={setEndsAt}
            location={location} setLocation={setLocation}
            description={description} setDescription={setDescription}
            error={error}
            isPending={isPending}
            onSubmit={handleSubmit}
            onCancel={() => setOpen(false)}
            submitLabel="Save Changes"
          />
        </div>
      </div>
    );
  }

  return (
    <FormFields
      title={title} setTitle={setTitle}
      type={type} setType={setType}
      startsAt={startsAt} setStartsAt={setStartsAt}
      endsAt={endsAt} setEndsAt={setEndsAt}
      location={location} setLocation={setLocation}
      description={description} setDescription={setDescription}
      error={error}
      isPending={isPending}
      onSubmit={handleSubmit}
      submitLabel="Add Item"
    />
  );
}

interface FieldProps {
  title: string; setTitle: (v: string) => void;
  type: ScheduleType; setType: (v: ScheduleType) => void;
  startsAt: string; setStartsAt: (v: string) => void;
  endsAt: string; setEndsAt: (v: string) => void;
  location: string; setLocation: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  error: string | null;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  submitLabel: string;
}

function FormFields({
  title, setTitle, type, setType,
  startsAt, setStartsAt, endsAt, setEndsAt,
  location, setLocation, description, setDescription,
  error, isPending, onSubmit, onCancel, submitLabel,
}: FieldProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Opening Keynote"
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ScheduleType)}
            className="gh-select w-full"
          >
            <option value="keynote">Keynote</option>
            <option value="workshop">Workshop</option>
            <option value="meal">Meal</option>
            <option value="deadline">Deadline</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Main Stage"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Starts At *</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Ends At</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details..."
            rows={2}
            className="gh-textarea w-full"
            style={{ fontSize: "13px" }}
          />
        </div>
      </div>

      {error && (
        <p style={{ fontSize: "12px", color: "var(--danger)", fontFamily: "var(--font-mono)" }}>{error}</p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending} size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {isPending ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
