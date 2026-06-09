import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import { getChallengeBySlug } from "@/lib/actions/challenges";
import { getApplicationsForChallenge } from "@/lib/actions/teams";
import { getPartnerProfileForUser } from "@/lib/actions/partners";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function ChallengeApplicationsPage({
  params,
}: {
  params: Promise<{ slug: string; cSlug: string }>;
}) {
  const { slug, cSlug } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const [challenge, admin] = await Promise.all([
    getChallengeBySlug(event.id, cSlug),
    isAdmin(session.user.id),
  ]);
  if (!challenge) notFound();

  const partnerProfile = await getPartnerProfileForUser(session.user.id, event.id);
  const isOwner = partnerProfile?.id === challenge.partnerId;
  if (!admin && !isOwner) redirect("/dashboard");

  const applications = await getApplicationsForChallenge(challenge.id);

  const grouped = {
    pending: applications.filter((a) => a.status === "pending"),
    accepted: applications.filter((a) => a.status === "accepted"),
    rejected: applications.filter((a) => a.status === "rejected"),
    withdrawn: applications.filter((a) => a.status === "withdrawn"),
  };

  return (
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "48rem" }}>
        <Button asChild variant="ghost" className="mb-6">
          <Link href={`/events/${slug}/challenges/${cSlug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Challenge</Link>
        </Button>
        <p className="gh-kicker mb-1">» Applications</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em", marginBottom: "4px" }}>Applications</h1>
        <p style={{ marginBottom: "28px", fontSize: "13px", color: "var(--fg-3)" }}>{challenge.title}</p>

        {applications.length === 0 ? (
          <div className="p-16 text-center" style={{ border: "1px dashed var(--border-strong)" }}>
            <p style={{ color: "var(--fg-3)" }}>No applications yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {(["pending", "accepted", "rejected", "withdrawn"] as const).map((status) => {
              const group = grouped[status];
              if (group.length === 0) return null;
              return (
                <section key={status}>
                  <p className="gh-kicker mb-3">» {status} ({group.length})</p>
                  <div className="space-y-2">
                    {group.map((app) => (
                      <div key={app.id} className="gh-card flex items-center justify-between px-5 py-4">
                        <div>
                          <Link href={`/events/${slug}/teams/${app.teamId}`} style={{ fontWeight: 600 }} className="hover:underline">{app.teamName}</Link>
                          {app.note && <p style={{ marginTop: "2px", fontSize: "13px", color: "var(--fg-3)" }}>{app.note}</p>}
                          <p style={{ marginTop: "2px", fontSize: "11px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>{new Date(app.createdAt).toLocaleDateString("en-GB")}</p>
                        </div>
                        <span style={{ padding: "2px 8px", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", background: status === "accepted" ? "var(--green-veil)" : status === "rejected" ? "rgba(255,71,87,0.1)" : status === "withdrawn" ? "var(--surface-3)" : "rgba(232,229,83,0.1)", color: status === "accepted" ? "var(--green)" : status === "rejected" ? "var(--danger)" : status === "withdrawn" ? "var(--fg-faint)" : "var(--warn)" }}>{status}</span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
