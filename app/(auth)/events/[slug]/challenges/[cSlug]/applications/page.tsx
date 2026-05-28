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
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <Button asChild variant="ghost" className="mb-6 text-slate-400 hover:text-white">
          <Link href={`/events/${slug}/challenges/${cSlug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Challenge
          </Link>
        </Button>

        <h1 className="mb-1 text-3xl font-bold">Applications</h1>
        <p className="mb-8 text-slate-400">{challenge.title}</p>

        {applications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-16 text-center">
            <p className="text-slate-400">No applications yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {(["pending", "accepted", "rejected", "withdrawn"] as const).map((status) => {
              const group = grouped[status];
              if (group.length === 0) return null;
              return (
                <section key={status}>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 capitalize">{status} ({group.length})</h2>
                  <div className="space-y-2">
                    {group.map((app) => (
                      <div key={app.id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-4">
                        <div>
                          <Link
                            href={`/events/${slug}/teams/${app.teamId}`}
                            className="font-semibold hover:underline"
                          >
                            {app.teamName}
                          </Link>
                          {app.note && <p className="mt-0.5 text-sm text-slate-400">{app.note}</p>}
                          <p className="mt-0.5 text-xs text-slate-500">
                            {new Date(app.createdAt).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            status === "accepted" ? "bg-green-900/50 text-green-300" :
                            status === "rejected" ? "bg-red-900/50 text-red-300" :
                            status === "withdrawn" ? "bg-slate-700 text-slate-400" :
                            "bg-yellow-900/50 text-yellow-300"
                          }`}>{status}</span>
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
