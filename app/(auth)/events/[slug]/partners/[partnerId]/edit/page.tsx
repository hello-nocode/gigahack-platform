import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import { getPartnerProfile, upsertPartnerProfile } from "@/lib/actions/partners";
import { PartnerProfileForm } from "@/components/partners/partner-profile-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function EditPartnerProfilePage({
  params,
}: {
  params: Promise<{ slug: string; partnerId: string }>;
}) {
  const { slug, partnerId } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  if (!session?.user?.id) redirect("/login");

  const [partner, admin] = await Promise.all([
    getPartnerProfile(partnerId),
    isAdmin(session.user.id),
  ]);
  if (!partner) notFound();
  if (partner.userId !== session.user.id && !admin) redirect("/dashboard");

  const boundAction = upsertPartnerProfile.bind(null, partnerId);

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4 text-slate-400 hover:text-white">
            <Link href={`/events/${slug}/partners/${partnerId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Edit Partner Profile</h1>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
          <PartnerProfileForm action={boundAction} defaultValues={partner} redirectTo={`/events/${slug}/partners/${partnerId}`} />
        </div>
      </div>
    </main>
  );
}
