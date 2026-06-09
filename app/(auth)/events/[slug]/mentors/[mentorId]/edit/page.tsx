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
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "40rem" }}>
        <div className="mb-8">
          <p className="gh-kicker mb-1">» Edit Profile</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "24px", letterSpacing: "-0.02em" }}>Edit Mentor Profile</h1>
          <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--fg-3)" }}>Fill in your details so teams can find and book sessions with you.</p>
        </div>
        <MentorProfileForm action={action} defaultValues={mentor} redirectTo={`/events/${slug}/mentors/${mentorId}/schedule`} />
      </div>
    </main>
  );
}
