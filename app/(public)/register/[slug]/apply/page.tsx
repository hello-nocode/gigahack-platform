import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getEventBySlug } from "@/lib/actions/events";
import { getMyRegistration } from "@/lib/actions/registrations";
import { RegisterButton } from "@/components/events/register-button";
import { ArrowLeft } from "lucide-react";

export default async function EventApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);

  if (!event) notFound();

  // Not logged in — send to login with callbackUrl back here
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/register/${slug}/apply`);
  }

  const registration = await getMyRegistration(event.id);

  // Already approved — go straight to the portal
  if (registration?.status === "approved") {
    redirect(`/events/${slug}`);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
      <div className="mx-auto max-w-lg">
        <Link
          href={`/register/${slug}`}
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to event page
        </Link>

        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-xl font-bold">{event.title}</h1>
          <p className="mt-0.5 text-sm text-slate-400">Edition {event.year}</p>
        </div>

        {!event.registrationOpen ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-8 text-center">
            <p className="text-slate-400">Registration is currently closed for this event.</p>
            <Link
              href={`/register/${slug}`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
            >
              ← Back to event page
            </Link>
          </div>
        ) : (
          <RegisterButton
            eventId={event.id}
            eventSlug={slug}
            registration={registration}
            redirectOnSuccess={`/events/${slug}`}
          />
        )}
      </div>
    </main>
  );
}
