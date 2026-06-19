import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getProfile } from "@/lib/actions/profile";
import { isProfileComplete } from "@/lib/profile-utils";
import { getEvents } from "@/lib/actions/events";
import { hasUserClaimedTicket } from "@/lib/actions/tickets";
import { getUserRolesForEvent, isAdmin } from "@/lib/permissions";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

// Roles that mean the user is NOT a plain participant and therefore should
// skip the ticket-verification step.
const NON_PARTICIPANT_ROLES = ["mentor", "jury", "coach", "partner_admin", "admin"] as const;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { next } = await searchParams;
  // Only allow internal paths as the final destination.
  const finalDestination = next && next.startsWith("/") ? next : "/dashboard";

  const [profile, admin, eventList] = await Promise.all([
    getProfile(userId),
    isAdmin(userId),
    getEvents(),
  ]);

  const profileComplete = profile ? isProfileComplete(profile) : false;

  // Find the active event for the participant workflow (same logic as dashboard).
  const activeEvent =
    eventList.find((e) =>
      ["registration_open", "applications_open", "in_progress", "judging"].includes(e.status),
    ) ??
    eventList[0] ??
    null;

  // Determine whether the ticket step applies. Global admins and users who hold
  // a non-participant role for the active event skip ticket verification.
  let needsTicket = false;
  if (activeEvent && !admin) {
    const roles = await getUserRolesForEvent(userId, activeEvent.id);
    const isNonParticipant = roles.some((r) =>
      (NON_PARTICIPANT_ROLES as readonly string[]).includes(r),
    );
    if (!isNonParticipant) {
      const claimed = await hasUserClaimedTicket(activeEvent.id, userId);
      needsTicket = !claimed;
    }
  }

  // Nothing left to do — send the user to their destination.
  if (profileComplete && !needsTicket) {
    redirect(finalDestination);
  }

  return (
    <OnboardingWizard
      startStep={profileComplete ? "ticket" : "profile"}
      needsTicket={needsTicket}
      finalDestination={finalDestination}
      activeEvent={
        activeEvent ? { id: activeEvent.id, title: activeEvent.title } : null
      }
      profileDefaults={{
        firstName: profile?.firstName ?? null,
        lastName: profile?.lastName ?? null,
        gender: profile?.gender ?? null,
        phone: profile?.phone ?? null,
        linkedin: profile?.linkedin ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        expertiseDomain: profile?.expertiseDomain ?? null,
        university: profile?.university ?? null,
        jobTitle: profile?.jobTitle ?? null,
        cvUrl: profile?.cvUrl ?? null,
        email: profile?.email ?? session.user.email ?? "",
      }}
    />
  );
}
