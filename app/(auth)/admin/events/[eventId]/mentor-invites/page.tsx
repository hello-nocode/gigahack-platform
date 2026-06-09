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
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "48rem" }}>
        <p className="gh-kicker mb-1">» Admin</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em", marginBottom: "4px" }}>Mentor Invites</h1>
        <p style={{ marginBottom: "24px", fontSize: "13px", color: "var(--fg-3)" }}>Generate single-use invite links for mentors</p>

        <form action={async () => { "use server"; await generateMentorInvite(eventId); }} className="mb-8">
          <Button type="submit">
            <Link2 className="mr-2 h-4 w-4" />Generate New Mentor Invite
          </Button>
        </form>

        <div className="space-y-2">
          {invites.length === 0 && <p style={{ fontSize: "13px", color: "var(--fg-faint)" }}>No invites yet.</p>}
          {invites.map((invite) => {
            const url = `${baseUrl}/mentor-invite/${invite.code}`;
            const used = !!invite.usedAt;
            const expired = invite.expiresAt ? invite.expiresAt < new Date() : false;
            return (
              <div key={invite.id} className="flex items-center justify-between gap-4 p-4" style={{
                opacity: used ? 0.5 : 1,
                border: expired ? "1px solid var(--warn)" : "1px solid var(--border)",
                background: expired ? "rgba(232,229,83,0.04)" : "var(--surface-2)",
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--fg-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</p>
                  <p style={{ marginTop: "4px", fontSize: "11px", color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
                    {used ? `Used ${invite.usedAt?.toLocaleDateString()}` : expired ? "Expired" : `Expires ${invite.expiresAt?.toLocaleDateString()}`}
                  </p>
                </div>
                {!used && !expired && <CopyButton text={url} />}
                {(used || expired) && (
                  <span style={{ flexShrink: 0, padding: "1px 8px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--fg-faint)", background: "var(--surface-3)", border: "1px solid var(--border)" }}>{used ? "Used" : "Expired"}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
