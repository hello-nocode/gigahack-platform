import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getProfile } from "@/lib/actions/profile";
import { db } from "@db/index";
import { partnerProfiles, eventRoles, events } from "@db/schema";
import { eq } from "drizzle-orm";
import { ProfileForm } from "@/components/profile/profile-form";
import { Building2, Users, History } from "lucide-react";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile, , partnerList, participantRoles] = await Promise.all([
    getProfile(session.user.id),
    isAdmin(session.user.id),
    db.select({ id: partnerProfiles.id, companyName: partnerProfiles.companyName, eventId: partnerProfiles.eventId })
      .from(partnerProfiles)
      .where(eq(partnerProfiles.userId, session.user.id)),
    db.select({ role: eventRoles.role, eventId: eventRoles.eventId })
      .from(eventRoles)
      .where(eq(eventRoles.userId, session.user.id)),
  ]);

  if (!profile) redirect("/dashboard");

  const eventIds = [...new Set([
    ...partnerList.map((p) => p.eventId),
    ...participantRoles.map((r) => r.eventId),
  ])];

  const eventMap: Record<string, { title: string; slug: string; year: number; status: string }> = {};
  if (eventIds.length > 0) {
    const evs = await db.select({ id: events.id, title: events.title, slug: events.slug, year: events.year, status: events.status })
      .from(events);
    for (const e of evs) eventMap[e.id] = e;
  }

  const displayName = profile.firstName && profile.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile.name ?? profile.email;

  const avatarSrc = profile.avatarUrl ?? profile.image;

  return (
    <main className="bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-2xl">
        {/* Profile header */}
        <div className="mb-8 flex items-center gap-5">
          {avatarSrc ? (
            <img src={avatarSrc} alt={displayName} className="h-16 w-16 rounded-full object-cover ring-2 ring-slate-700" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-xl font-bold text-white ring-2 ring-slate-600">
              {(profile.firstName?.[0] ?? profile.name?.[0] ?? profile.email?.[0] ?? "?").toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-slate-400">{profile.email}</p>
          </div>
        </div>

        {/* Edit form */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
          <h2 className="mb-6 text-lg font-semibold">Personal Information</h2>
          <ProfileForm
            defaultValues={{
              firstName: profile.firstName,
              lastName: profile.lastName,
              gender: profile.gender,
              phone: profile.phone,
              linkedin: profile.linkedin,
              avatarUrl: profile.avatarUrl,
              email: profile.email,
            }}
          />
        </div>

        {/* Role-specific sections */}
        {partnerList.length > 0 && (
          <div className="mt-6 rounded-2xl border border-violet-700/30 bg-violet-900/10 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-violet-200">
              <Building2 className="h-5 w-5" /> Partner Profiles
            </h2>
            <div className="space-y-2">
              {partnerList.map((p) => {
                const ev = eventMap[p.eventId];
                return (
                  <Link
                    key={p.id}
                    href={`/events/${ev?.slug}/partners/${p.id}/edit`}
                    className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 hover:border-violet-600 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{p.companyName}</p>
                      {ev && <p className="text-xs text-slate-400">{ev.title} · {ev.year}</p>}
                    </div>
                    <span className="text-xs text-slate-400">Edit →</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {(() => {
          const participantEvts = participantRoles
            .filter((r) => r.role === "participant")
            .map((r) => ({ ...r, ev: eventMap[r.eventId] }))
            .filter((r) => r.ev);
          const activeEvts = participantEvts.filter((r) => r.ev!.status !== "completed");
          const pastEvts = participantEvts.filter((r) => r.ev!.status === "completed");
          if (participantEvts.length === 0) return null;
          return (
            <>
              {activeEvts.length > 0 && (
                <div className="mt-6 rounded-2xl border border-green-700/30 bg-green-900/10 p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-green-200">
                    <Users className="h-5 w-5" /> Event Participation
                  </h2>
                  <div className="space-y-2">
                    {activeEvts.map((r) => (
                      <Link
                        key={r.eventId}
                        href={`/events/${r.ev!.slug}/teams`}
                        className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 hover:border-green-600 transition-colors"
                      >
                        <p className="font-medium">{r.ev!.title} · {r.ev!.year}</p>
                        <span className="text-xs text-slate-400">My Team →</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {pastEvts.length > 0 && (
                <div className="mt-6 rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-400">
                    <History className="h-5 w-5" /> Past Events
                  </h2>
                  <div className="space-y-2">
                    {pastEvts.map((r) => (
                      <Link
                        key={r.eventId}
                        href={`/events/${r.ev!.slug}/teams`}
                        className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 hover:border-slate-500 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-slate-300">{r.ev!.title} · {r.ev!.year}</p>
                          <p className="text-xs text-slate-500">Completed · Read only</p>
                        </div>
                        <span className="text-xs text-slate-500">View →</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </main>
  );
}
