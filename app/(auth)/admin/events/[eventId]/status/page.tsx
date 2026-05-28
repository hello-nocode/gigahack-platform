import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug, getValidTransitions, getStatusLabel, updateEventStatus } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

const statusColors: Record<string, string> = {
  draft: "bg-slate-700 text-slate-300",
  registration_open: "bg-blue-900/60 text-blue-300",
  applications_open: "bg-green-900/60 text-green-300",
  in_progress: "bg-yellow-900/60 text-yellow-300",
  judging: "bg-purple-900/60 text-purple-300",
  completed: "bg-emerald-900/60 text-emerald-300",
};

export default async function EventStatusPage({ params }: PageProps) {
  const { eventId } = await params;
  const [event, session] = await Promise.all([
    getEventBySlug(eventId),
    auth(),
  ]);

  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const admin = await isAdmin(session.user.id);
  if (!admin) redirect("/dashboard");

  const validTransitions = await getValidTransitions(event.status);
  const statusLabel = await getStatusLabel(event.status);

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4 text-slate-400 hover:text-white">
            <Link href={`/events/${event.slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Event Status</h1>
          <p className="mt-1 text-sm text-slate-400">{event.title}</p>
        </div>

        {/* Current Status */}
        <div className="mb-8 rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
          <h2 className="mb-4 text-lg font-semibold">Current Status</h2>
          <div className="flex items-center gap-4">
            <span className={`rounded-full px-4 py-2 text-lg font-medium ${statusColors[event.status]}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Available Transitions */}
        <div className="mb-8 rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
          <h2 className="mb-4 text-lg font-semibold">Available Transitions</h2>
          {validTransitions.length === 0 ? (
            <p className="text-slate-500">No transitions available from this state.</p>
          ) : (
            <div className="space-y-3">
              {validTransitions.map((transition) => (
                <form key={transition} action={async () => {
                  "use server";
                  await updateEventStatus(event.id, transition);
                }}>
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full justify-between border-slate-600 bg-slate-800 hover:bg-slate-700"
                  >
                    <span>Transition to {getStatusLabel(transition)}</span>
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${statusColors[transition]}`}>
                      {getStatusLabel(transition)}
                    </span>
                  </Button>
                </form>
              ))}
            </div>
          )}
        </div>

        {/* Status Flow Diagram */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
          <h2 className="mb-4 text-lg font-semibold">Status Flow</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded px-2 py-1 ${event.status === "draft" ? statusColors.draft : "text-slate-500"}`}>
              Draft
            </span>
            <span className="text-slate-600">→</span>
            <span className={`rounded px-2 py-1 ${event.status === "registration_open" ? statusColors.registration_open : "text-slate-500"}`}>
              Registration Open
            </span>
            <span className="text-slate-600">→</span>
            <span className={`rounded px-2 py-1 ${event.status === "applications_open" ? statusColors.applications_open : "text-slate-500"}`}>
              Applications Open
            </span>
            <span className="text-slate-600">→</span>
            <span className={`rounded px-2 py-1 ${event.status === "in_progress" ? statusColors.in_progress : "text-slate-500"}`}>
              In Progress
            </span>
            <span className="text-slate-600">→</span>
            <span className={`rounded px-2 py-1 ${event.status === "judging" ? statusColors.judging : "text-slate-500"}`}>
              Judging
            </span>
            <span className="text-slate-600">→</span>
            <span className={`rounded px-2 py-1 ${event.status === "completed" ? statusColors.completed : "text-slate-500"}`}>
              Completed
            </span>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-700/50 bg-amber-900/20 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-400" />
            <div className="text-sm text-amber-200">
              <p className="font-medium">Important</p>
              <p className="mt-1 text-amber-200/80">
                Status transitions trigger automated actions. Moving forward closes previous stages
                (e.g., closing registration freezes teams).
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
