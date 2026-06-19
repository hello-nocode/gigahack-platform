import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getProfile } from "@/lib/actions/profile";
import { db } from "@db/index";
import { partnerProfiles, eventRoles, events } from "@db/schema";
import { eq } from "drizzle-orm";
import { ProfileForm } from "@/components/profile/profile-form";
import { PasswordSettings } from "@/components/profile/password-settings";
import { hasPassword } from "@/lib/actions/auth";
import { Building2, Users, History } from "lucide-react";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile, , partnerList, participantRoles, userHasPassword] = await Promise.all([
    getProfile(session.user.id),
    isAdmin(session.user.id),
    db.select({ id: partnerProfiles.id, companyName: partnerProfiles.companyName, eventId: partnerProfiles.eventId })
      .from(partnerProfiles)
      .where(eq(partnerProfiles.userId, session.user.id)),
    db.select({ role: eventRoles.role, eventId: eventRoles.eventId })
      .from(eventRoles)
      .where(eq(eventRoles.userId, session.user.id)),
    hasPassword(session.user.id),
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
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "40rem" }}>
        <div className="mb-8 flex items-center gap-5">
          {avatarSrc ? (
            <img src={avatarSrc} alt={displayName} style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
          ) : (
            <div style={{ width: 60, height: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink-650)", fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 700, color: "var(--fg-2)" }}>
              {(profile.firstName?.[0] ?? profile.name?.[0] ?? profile.email?.[0] ?? "?").toUpperCase()}
            </div>
          )}
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "22px", letterSpacing: "-0.02em" }}>{displayName}</h1>
            <p style={{ fontSize: "13px", color: "var(--fg-3)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>{profile.email}</p>
          </div>
        </div>

        <div className="gh-card p-8">
          <p className="gh-kicker mb-4">» Personal Information</p>
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

        <PasswordSettings userId={session.user.id} hasPassword={userHasPassword} />

        {partnerList.length > 0 && (
          <div className="mt-6 p-6" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <p className="gh-kicker mb-4" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Building2 style={{ width: 13, height: 13 }} /> Partner Profiles
            </p>
            <div className="space-y-2">
              {partnerList.map((p) => {
                const ev = eventMap[p.eventId];
                return (
                  <Link key={p.id} href={`/events/${ev?.slug}/partners/${p.id}/edit`}
                    className="gh-card gh-card-hover flex items-center justify-between px-4 py-3">
                    <div>
                      <p style={{ fontWeight: 500 }}>{p.companyName}</p>
                      {ev && <p style={{ fontSize: "12px", color: "var(--fg-3)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>{ev.title} · {ev.year}</p>}
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>Edit →</span>
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
                <div className="mt-6 p-6" style={{ background: "var(--green-veil)", border: "1px solid var(--green)" }}>
                  <p className="gh-kicker mb-4" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Users style={{ width: 13, height: 13 }} /> Event Participation
                  </p>
                  <div className="space-y-2">
                    {activeEvts.map((r) => (
                      <Link key={r.eventId} href={`/events/${r.ev!.slug}/teams`}
                        className="gh-card gh-card-hover flex items-center justify-between px-4 py-3">
                        <p style={{ fontWeight: 500 }}>{r.ev!.title} · {r.ev!.year}</p>
                        <span style={{ fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>My Team →</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {pastEvts.length > 0 && (
                <div className="mt-6 p-6" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <p className="gh-kicker mb-4" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <History style={{ width: 13, height: 13 }} /> Past Events
                  </p>
                  <div className="space-y-2">
                    {pastEvts.map((r) => (
                      <Link key={r.eventId} href={`/events/${r.ev!.slug}/teams`}
                        className="gh-card gh-card-hover flex items-center justify-between px-4 py-3">
                        <div>
                          <p style={{ fontWeight: 500, color: "var(--fg-2)" }}>{r.ev!.title} · {r.ev!.year}</p>
                          <p style={{ fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>Completed · Read only</p>
                        </div>
                        <span style={{ fontSize: "12px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>View →</span>
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
