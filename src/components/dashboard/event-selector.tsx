"use client";

import { useRouter } from "next/navigation";

interface EventOption {
  slug: string;
  title: string;
  year: number;
}

interface EventSelectorProps {
  events: EventOption[];
  selectedSlug: string;
}

export function EventSelector({ events, selectedSlug }: EventSelectorProps) {
  const router = useRouter();

  return (
    <select
      value={selectedSlug}
      onChange={(e) => router.push(`/dashboard?event=${e.target.value}`)}
      className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      {events.map((ev) => (
        <option key={ev.slug} value={ev.slug}>
          {ev.title} ({ev.year})
        </option>
      ))}
    </select>
  );
}
