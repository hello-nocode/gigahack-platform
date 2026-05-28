import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/permissions";
import { getEventBySlug } from "@/lib/actions/events";
import { getPartnersForEvent } from "@/lib/actions/partners";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, ExternalLink } from "lucide-react";

export default async function PartnersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();

  const [partners, admin] = await Promise.all([
    getPartnersForEvent(event.id),
    session?.user?.id ? isAdmin(session.user.id) : Promise.resolve(false),
  ]);

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" className="text-slate-400 hover:text-white">
            <Link href={`/events/${slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Link>
          </Button>
          {admin && (
            <Button asChild variant="outline" className="border-slate-500 bg-slate-800 text-white hover:bg-slate-700 hover:text-white">
              <Link href={`/admin/events/${event.id}/invites`}>
                Manage Invites
              </Link>
            </Button>
          )}
        </div>

        <h1 className="mb-8 text-3xl font-bold">Partners</h1>

        {partners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-16 text-center">
            <Building2 className="mx-auto mb-4 h-10 w-10 text-slate-600" />
            <p className="text-slate-400">No partners yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {partners.map((partner) => (
              <Link
                key={partner.id}
                href={`/events/${slug}/partners/${partner.id}`}
                className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 transition-colors hover:border-slate-500 hover:bg-slate-800"
              >
                <div className="flex items-start gap-4">
                  {partner.logoUrl ? (
                    <img
                      src={partner.logoUrl}
                      alt={partner.companyName}
                      className="h-12 w-12 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-700">
                      <Building2 className="h-6 w-6 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="font-semibold">{partner.companyName}</h2>
                    {partner.website && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                        <ExternalLink className="h-3 w-3" />
                        {partner.website.replace(/^https?:\/\//, "")}
                      </p>
                    )}
                    {partner.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-slate-400">
                        {partner.description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
