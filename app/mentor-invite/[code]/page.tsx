import { redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@/lib/auth/config";
import { acceptMentorInvite } from "@/lib/actions/mentors";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function MentorInvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/mentor-invite/${code}`);
  }

  const result = await acceptMentorInvite(code);

  if (result.success) {
    redirect(`/events/${result.eventSlug}/mentors/${result.mentorId}/edit` as Route);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex items-center justify-center">
          <span className="text-5xl">⚠️</span>
        </div>
        <h1 className="mb-3 text-2xl font-bold">Invite Error</h1>
        <p className="mb-6 text-slate-400">{result.error}</p>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
