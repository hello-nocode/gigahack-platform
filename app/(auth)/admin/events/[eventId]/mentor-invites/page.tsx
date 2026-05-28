import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { generateMentorInvite, getMentorInvitesForEvent } from "@/lib/actions/mentors";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";

export default async function MentorInvitesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const admin = await isAdmin(session.user.id);
  if (!admin) redirect("/dashboard");

  const invites = await getMentorInvitesForEvent(eventId);
  const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Mentor Invites</h1>
          <p className="mt-1 text-sm text-slate-400">
            Generate single-use invite links for mentors
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await generateMentorInvite(eventId);
          }}
          className="mb-8"
        >
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Link2 className="mr-2 h-4 w-4" />
            Generate New Mentor Invite
          </Button>
        </form>

        <div className="space-y-3">
          {invites.length === 0 && (
            <p className="text-slate-500">No invites yet.</p>
          )}
          {invites.map((invite) => {
            const url = `${baseUrl}/mentor-invite/${invite.code}`;
            const used = !!invite.usedAt;
            const expired = invite.expiresAt ? invite.expiresAt < new Date() : false;

            return (
              <div
                key={invite.id}
                className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
                  used
                    ? "border-slate-700 bg-slate-800/30 opacity-60"
                    : expired
                      ? "border-yellow-800/50 bg-yellow-900/10"
                      : "border-slate-600 bg-slate-800/50"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-slate-300">{url}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {used
                      ? `Used ${invite.usedAt?.toLocaleDateString()}`
                      : expired
                        ? "Expired"
                        : `Expires ${invite.expiresAt?.toLocaleDateString()}`}
                  </p>
                </div>
                {!used && !expired && <CopyButton text={url} />}
                {(used || expired) && (
                  <span className="shrink-0 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
                    {used ? "Used" : "Expired"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
