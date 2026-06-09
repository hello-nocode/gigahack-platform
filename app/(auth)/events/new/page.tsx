import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { createEvent } from "@/lib/actions/events";
import { EventForm } from "@/components/events/event-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewEventPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const admin = await isAdmin(session.user.id);
  if (!admin) redirect("/dashboard");

  return (
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "40rem" }}>
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href="/events"><ArrowLeft className="mr-2 h-4 w-4" />All Events</Link>
          </Button>
          <p className="gh-kicker mb-1">» New Edition</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em" }}>New Event</h1>
          <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--fg-3)" }}>Create a new Gigahack edition</p>
        </div>
        <div className="gh-card p-8">
          <EventForm action={createEvent} submitLabel="Create Event" />
        </div>
      </div>
    </main>
  );
}
