"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { markAsRead, markAllRead } from "@/lib/actions/notifications";
import type { Notification } from "@db/schema";

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
}

const typeLabels: Record<string, string> = {
  mentor_booked: "📅",
  session_reminder: "⏰",
  join_request_received: "👋",
  join_request_reviewed: "✅",
  admin_broadcast: "📢",
};

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell({ notifications, unreadCount }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [localNotifs, setLocalNotifs] = useState(notifications);
  const [localUnread, setLocalUnread] = useState(unreadCount);
  const [, startTransition] = useTransition();

  function handleMarkRead(id: string) {
    setLocalNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)),
    );
    setLocalUnread((c) => Math.max(0, c - 1));
    startTransition(() => { void markAsRead(id); });
  }

  function handleMarkAllRead() {
    setLocalNotifs((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    setLocalUnread(0);
    startTransition(() => { void markAllRead(); });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="gh-btn-ghost relative flex h-9 w-9 items-center justify-center transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {localUnread > 0 && (
          <span style={{ position: "absolute", top: "-2px", right: "-2px", display: "flex", alignItems: "center", justifyContent: "center", height: "16px", minWidth: "16px", padding: "0 3px", background: "var(--danger)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>
            {localUnread > 9 ? "9+" : localUnread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", right: 0, top: "44px", zIndex: 50, width: "320px", background: "var(--ink-800)", border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
              <p className="gh-kicker" style={{ margin: 0 }}>» Notifications</p>
              {localUnread > 0 && (
                <button onClick={handleMarkAllRead}
                  style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--green)", letterSpacing: "0.04em" }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div style={{ maxHeight: "384px", overflowY: "auto" }}>
              {localNotifs.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", fontSize: "13px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
                  No notifications yet
                </div>
              ) : (
                localNotifs.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.readAt) handleMarkRead(n.id);
                      if (n.link) { setOpen(false); window.location.href = n.link; }
                    }}
                    style={{ display: "flex", gap: "12px", padding: "12px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", background: !n.readAt ? "var(--green-veil)" : "transparent" }}
                    className="gh-card-hover"
                  >
                    <span style={{ marginTop: "2px", flexShrink: 0, fontSize: "14px" }}>{typeLabels[n.type] ?? "🔔"}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: "13px", lineHeight: 1.4, fontWeight: !n.readAt ? 600 : 400, color: !n.readAt ? "var(--fg-1)" : "var(--fg-2)" }}>{n.title}</p>
                      <p style={{ marginTop: "2px", fontSize: "12px", color: "var(--fg-3)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.body}</p>
                      <p style={{ marginTop: "4px", fontSize: "11px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.readAt && (
                      <span style={{ marginTop: "6px", flexShrink: 0, width: "6px", height: "6px", background: "var(--green)" }} />
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{ borderTop: "1px solid var(--line)", padding: "10px 16px" }}>
              <a href="/profile/notifications" style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--fg-faint)", letterSpacing: "0.04em" }}>
                Manage preferences →
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
