import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import { getMentorProfile, upsertMentorProfile } from "@/lib/actions/mentors";
import { MentorProfileForm } from "@/components/mentors/mentor-profile-form";

export default async function MentorEditPage({
  params,
}: {
  params: Promise<{ slug: string; mentorId: string }>;
}) {
  const { slug, mentorId } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const [mentor, admin] = await Promise.all([
    getMentorProfile(mentorId),
    isAdmin(session.user.id),
  ]);
  if (!mentor || mentor.eventId !== event.id) notFound();
  if (mentor.userId !== session.user.id && !admin) redirect("/dashboard");

  const action = upsertMentorProfile.bind(null, mentorId);

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Edit Mentor Profile</h1>
          <p className="mt-1 text-sm text-slate-400">
            Fill in your details so teams can find and book sessions with you.
          </p>
        </div>
        <MentorProfileForm
          action={action}
          defaultValues={mentor}
          redirectTo={`/events/${slug}/mentors/${mentorId}/schedule`}
        />
      </div>
    </main>
  );
}
