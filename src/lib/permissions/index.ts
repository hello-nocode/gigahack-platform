import { db } from "@db/index";
import { eventRoles, users } from "@db/schema";
import { and, eq } from "drizzle-orm";

export type Role = "participant" | "partner_admin" | "mentor" | "coach" | "jury" | "admin";

/**
 * Returns all roles a user holds for a given event.
 * This is the single source of truth for event-scoped permissions.
 */
export async function getUserRolesForEvent(userId: string, eventId: string): Promise<Role[]> {
  const rows = await db
    .select({ role: eventRoles.role })
    .from(eventRoles)
    .where(and(eq(eventRoles.userId, userId), eq(eventRoles.eventId, eventId)));
  return rows.map((r) => r.role as Role);
}

/**
 * Checks whether a user has a specific role for an event.
 */
export async function hasRole(userId: string, eventId: string, role: Role): Promise<boolean> {
  const roles = await getUserRolesForEvent(userId, eventId);
  return roles.includes(role);
}

/**
 * Checks whether a user has any of the given roles for an event.
 */
export async function hasAnyRole(
  userId: string,
  eventId: string,
  roles: Role[],
): Promise<boolean> {
  const userRoles = await getUserRolesForEvent(userId, eventId);
  return roles.some((r) => userRoles.includes(r));
}

/**
 * Checks whether a user is a global admin.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ globalRole: users.globalRole })
    .from(users)
    .where(eq(users.id, userId));
  return row?.globalRole === "admin";
}
