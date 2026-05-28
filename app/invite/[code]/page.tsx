import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { acceptInvite } from "@/lib/actions/partners";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${code}`)}`);
  }

  const result = await acceptInvite(code);

  if (result.success) {
    redirect(`/events/${result.eventSlug}/partners`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-red-700/50 bg-red-900/20 p-8 text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h1 className="mb-2 text-xl font-bold">Invite Error</h1>
        <p className="text-slate-300">{result.error}</p>
        <a
          href="/dashboard"
          className="mt-6 inline-block rounded-md bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
        >
          Go to Dashboard
        </a>
      </div>
    </main>
  );
}
