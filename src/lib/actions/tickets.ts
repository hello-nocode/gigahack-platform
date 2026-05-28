"use server";

import { db } from "@db/index";
import { eventTickets, events, users } from "@db/schema";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { eq, and, isNull, isNotNull, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const admin = await isAdmin(session.user.id);
  if (!admin) return null;
  return session.user.id;
}

export type TicketUploadResult =
  | { success: true; inserted: number; skipped: number; error?: never }
  | { success?: never; error: string };

// ── Upload tickets (CSV) ──────────────────────────────────────────────────────

export async function uploadTickets(
  eventId: string,
  csvText: string,
): Promise<TicketUploadResult> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorised" };

  const [event] = await db.select({ id: events.id, slug: events.slug }).from(events).where(eq(events.id, eventId));
  if (!event) return { error: "Event not found" };

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { error: "No ticket numbers found in the file" };

  // Auto-skip header row only if the first line is purely text (no digits) — e.g. "ticket_number", "Ticket Number"
  // Ticket numbers like TKT-001 contain both letters AND digits, so they are NOT headers
  const hasHeader = lines[0] ? /^[a-zA-Z_,\s"']+$/.test(lines[0]) : false;
  const numbers = (hasHeader ? lines.slice(1) : lines)
    .map((l) => l.split(",")[0]?.trim() ?? "") // handle multi-column CSVs — take first column
    .filter(Boolean);

  if (numbers.length === 0) return { error: "No valid ticket numbers found" };

  // Deduplicate within the batch
  const unique = [...new Set(numbers)];

  // Bulk insert, skip duplicates
  const rows = unique.map((n) => ({ eventId, ticketNumber: n }));

  let inserted = 0;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const result = await db
      .insert(eventTickets)
      .values(chunk)
      .onConflictDoNothing()
      .returning({ id: eventTickets.id });
    inserted += result.length;
  }

  const skipped = unique.length - inserted;
  revalidatePath(`/events/${event.slug}/tickets`);
  return { success: true, inserted, skipped };
}

// ── Delete unclaimed tickets for an event ──────────────────────────────────

export type TicketDeleteResult =
  | { success: true; deleted: number; error?: never }
  | { success?: never; error: string };

export async function deleteUnclaimedTickets(
  eventId: string,
): Promise<TicketDeleteResult> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorised" };

  const [event] = await db.select({ id: events.id, slug: events.slug }).from(events).where(eq(events.id, eventId));
  if (!event) return { error: "Event not found" };

  const deleted = await db
    .delete(eventTickets)
    .where(and(eq(eventTickets.eventId, eventId), isNull(eventTickets.claimedBy)))
    .returning({ id: eventTickets.id });

  revalidatePath(`/events/${event.slug}/tickets`);
  return { success: true, deleted: deleted.length };
}

// ── Verify and claim a ticket ────────────────────────────────────────────────

export type TicketClaimResult =
  | { success: true; error?: never }
  | { success?: never; error: string };

export async function verifyAndClaimTicket(
  eventId: string,
  ticketNumber: string,
  userId: string,
): Promise<TicketClaimResult> {
  const trimmed = ticketNumber.trim();
  if (!trimmed) return { error: "Ticket number is required" };

  const [ticket] = await db
    .select()
    .from(eventTickets)
    .where(and(eq(eventTickets.eventId, eventId), eq(eventTickets.ticketNumber, trimmed)));

  if (!ticket) return { error: "Ticket number not found. Please check the number and try again." };
  if (ticket.claimedBy && ticket.claimedBy !== userId)
    return { error: "This ticket has already been used by another participant." };
  if (ticket.claimedBy === userId) return { success: true }; // idempotent re-submit

  // Claim it
  await db
    .update(eventTickets)
    .set({ claimedBy: userId, claimedAt: new Date() })
    .where(eq(eventTickets.id, ticket.id));

  return { success: true };
}

// ── Ticket stats for an event ────────────────────────────────────────────────

export async function getTicketStats(eventId: string) {
  const [total, claimed] = await Promise.all([
    db
      .select({ count: count() })
      .from(eventTickets)
      .where(eq(eventTickets.eventId, eventId))
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ count: count() })
      .from(eventTickets)
      .where(and(eq(eventTickets.eventId, eventId), isNotNull(eventTickets.claimedBy)))
      .then((r) => r[0]?.count ?? 0),
  ]);
  return { total, claimed, unclaimed: Number(total) - Number(claimed) };
}

// ── Full ticket list for admin ───────────────────────────────────────────────

export async function getTicketList(eventId: string) {
  return db
    .select({
      id: eventTickets.id,
      ticketNumber: eventTickets.ticketNumber,
      uploadedAt: eventTickets.uploadedAt,
      claimedAt: eventTickets.claimedAt,
      claimedBy: eventTickets.claimedBy,
      userName: users.name,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
    })
    .from(eventTickets)
    .leftJoin(users, eq(users.id, eventTickets.claimedBy))
    .where(eq(eventTickets.eventId, eventId))
    .orderBy(eventTickets.uploadedAt);
}

export type TicketListItem = Awaited<ReturnType<typeof getTicketList>>[number];
