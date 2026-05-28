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
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4 text-slate-400 hover:text-white">
            <Link href="/events">
              <ArrowLeft className="mr-2 h-4 w-4" />
              All Events
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">New Event</h1>
          <p className="mt-1 text-sm text-slate-400">Create a new Gigahack edition</p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
          <EventForm action={createEvent} submitLabel="Create Event" />
        </div>
      </div>
    </main>
  );
}
