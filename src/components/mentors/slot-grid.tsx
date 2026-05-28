"use client";

import { useTransition } from "react";
import { bookSlot, cancelBooking, deleteMentorSlot } from "@/lib/actions/mentors";
import type { MentorSlot, MentorBooking } from "@db/schema";

interface SlotWithBooking extends MentorSlot {
  booking: MentorBooking | null;
}

interface SlotGridProps {
  slots: SlotWithBooking[];
  /** If set, the grid is in "booking mode": team leader can book/cancel */
  teamId?: string;
  /** If set, the grid is in "manage mode": mentor can delete unbooked slots */
  isMentor?: boolean;
  /** The currently logged-in user's team booking ids — for cancel UI */
  myTeamId?: string;
}

function groupByDate(slots: SlotWithBooking[]) {
  const map = new Map<string, SlotWithBooking[]>();
  for (const s of slots) {
    const key = s.startsAt.toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return map;
}

function fmtTime(d: Date) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function SlotGrid({ slots, teamId, isMentor, myTeamId }: SlotGridProps) {
  const [pending, startTransition] = useTransition();

  if (slots.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
        No slots available yet.
      </p>
    );
  }

  const grouped = groupByDate(slots);

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([date, daySlots]) => (
        <div key={date}>
          <p className="mb-3 text-sm font-semibold text-slate-300">{fmtDate(date)}</p>
          <div className="flex flex-wrap gap-2">
            {daySlots.map((slot) => {
              const isBooked = !!slot.booking;
              const isMyTeam = slot.booking?.teamId === myTeamId;
              const isPast = new Date(slot.startsAt) < new Date();

              let btnClass =
                "rounded-lg border px-3 py-2 text-xs font-medium transition-colors ";

              if (isPast) {
                btnClass += "border-slate-700 bg-slate-800/30 text-slate-600 cursor-default";
              } else if (isMyTeam) {
                btnClass += "border-green-600/50 bg-green-900/20 text-green-300 hover:bg-green-900/40";
              } else if (isBooked) {
                btnClass += "border-slate-700 bg-slate-800/20 text-slate-500 cursor-not-allowed";
              } else {
                btnClass += "border-blue-600/50 bg-blue-900/20 text-blue-300 hover:bg-blue-900/40";
              }

              const label = `${fmtTime(slot.startsAt)} – ${fmtTime(slot.endsAt)}`;

              if (isMentor) {
                return (
                  <div key={slot.id} className="flex flex-col items-center gap-1">
                    <span className={`${btnClass} flex items-center gap-1`}>
                      {label}
                      {isBooked && (
                        <span className="ml-1 rounded-full bg-violet-700/50 px-1.5 text-[10px] text-violet-300">
                          booked
                        </span>
                      )}
                    </span>
                    {!isBooked && !isPast && (
                      <button
                        onClick={() =>
                          startTransition(async () => {
                            await deleteMentorSlot(slot.id);
                          })
                        }
                        disabled={pending}
                        className="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
                      >
                        delete
                      </button>
                    )}
                  </div>
                );
              }

              if (teamId) {
                if (isMyTeam && slot.booking) {
                  return (
                    <button
                      key={slot.id}
                      className={btnClass}
                      disabled={pending || isPast}
                      onClick={() =>
                        startTransition(async () => {
                          await cancelBooking(slot.booking!.id);
                        })
                      }
                      title="Click to cancel"
                    >
                      {label} ✓ (cancel)
                    </button>
                  );
                }
                return (
                  <button
                    key={slot.id}
                    className={btnClass}
                    disabled={pending || isBooked || isPast}
                    onClick={() =>
                      !isBooked &&
                      !isPast &&
                      startTransition(async () => {
                        await bookSlot(slot.id, teamId);
                      })
                    }
                  >
                    {label}
                    {isBooked && " ✗"}
                  </button>
                );
              }

              return (
                <span key={slot.id} className={btnClass}>
                  {label}
                  {isBooked && (
                    <span className="ml-1 rounded-full bg-slate-700 px-1.5 text-[10px] text-slate-400">
                      booked
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
