"use client";

import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Home",
  "/events": "Events",
  "/profile": "Profile",
  "/profile/notifications": "Notifications",
  "/admin/notifications": "Broadcasts",
};

function resolveLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  if (pathname.match(/\/events\/[^/]+\/challenges\/[^/]+\/applications$/)) return "Applications";
  if (pathname.match(/\/events\/[^/]+\/challenges\/[^/]+\/edit$/)) return "Edit Challenge";
  if (pathname.match(/\/events\/[^/]+\/challenges\/[^/]+$/)) return "Challenge";
  if (pathname.match(/\/events\/[^/]+\/challenges\/new$/)) return "New Challenge";
  if (pathname.match(/\/events\/[^/]+\/challenges$/)) return "Challenges";
  if (pathname.match(/\/events\/[^/]+\/teams\/[^/]+\/edit$/)) return "Edit Team";
  if (pathname.match(/\/events\/[^/]+\/teams\/[^/]+$/)) return "Team";
  if (pathname.match(/\/events\/[^/]+\/teams\/new$/)) return "New Team";
  if (pathname.match(/\/events\/[^/]+\/teams$/)) return "Teams";
  if (pathname.match(/\/events\/[^/]+\/mentors\/[^/]+\/schedule$/)) return "Schedule";
  if (pathname.match(/\/events\/[^/]+\/mentors\/[^/]+\/edit$/)) return "Edit Mentor";
  if (pathname.match(/\/events\/[^/]+\/mentors\/[^/]+$/)) return "Mentor";
  if (pathname.match(/\/events\/[^/]+\/mentors$/)) return "Mentors";
  if (pathname.match(/\/events\/[^/]+\/schedule$/)) return "Schedule";
  if (pathname.match(/\/events\/[^/]+\/partners\/[^/]+\/edit$/)) return "Edit Partner";
  if (pathname.match(/\/events\/[^/]+\/partners\/[^/]+$/)) return "Partner";
  if (pathname.match(/\/events\/[^/]+\/partners$/)) return "Partners";
  if (pathname.match(/\/events\/[^/]+\/registrations$/)) return "Registrations";
  if (pathname.match(/\/events\/[^/]+\/tickets$/)) return "Tickets";
  if (pathname.match(/\/events\/[^/]+\/edit$/)) return "Edit Event";
  if (pathname.match(/\/events\/[^/]+$/)) return "Event";
  if (pathname.match(/\/events\/new$/)) return "New Event";
  if (pathname.match(/\/admin\/events\/[^/]+\/invites$/)) return "Partner Invites";
  if (pathname.match(/\/admin\/events\/[^/]+\/mentor-invites$/)) return "Mentor Invites";
  if (pathname.match(/\/admin\/events\/[^/]+\/status$/)) return "Event Status";
  if (pathname.match(/\/admin\/events\/[^/]+\/schedule$/)) return "Event Schedule";
  return "GigaHack";
}

export function PageTitle() {
  const pathname = usePathname();
  const label = resolveLabel(pathname);
  return (
    <span style={{ fontFamily: "var(--font-ui)", fontWeight: 500, fontSize: "15px", color: "var(--fg-1)" }}>
      {label}
    </span>
  );
}
