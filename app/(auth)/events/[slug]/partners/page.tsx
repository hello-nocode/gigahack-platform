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
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "48rem" }}>
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost">
            <Link href={`/events/${slug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Event</Link>
          </Button>
          {admin && (
            <Button asChild variant="outline">
              <Link href={`/admin/events/${event.id}/invites`}>Manage Invites</Link>
            </Button>
          )}
        </div>

        <p className="gh-kicker mb-1">» Partners</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "28px", letterSpacing: "-0.02em", marginBottom: "28px" }}>Partners</h1>

        {partners.length === 0 ? (
          <div className="p-16 text-center" style={{ border: "1px dashed var(--border-strong)" }}>
            <Building2 className="mx-auto mb-4 h-10 w-10" style={{ color: "var(--fg-faint)" }} />
            <p style={{ color: "var(--fg-3)" }}>No partners yet.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {partners.map((partner) => (
              <Link key={partner.id} href={`/events/${slug}/partners/${partner.id}`} className="gh-card gh-card-hover p-6">
                <div className="flex items-start gap-4">
                  {partner.logoUrl ? (
                    <img src={partner.logoUrl} alt={partner.companyName}
                      style={{ width: 44, height: 44, objectFit: "contain", flexShrink: 0, background: "var(--surface-3)", padding: "4px" }} />
                  ) : (
                    <div style={{ width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink-650)" }}>
                      <Building2 style={{ width: 20, height: 20, color: "var(--fg-3)" }} />
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontWeight: 600 }}>{partner.companyName}</h2>
                    {partner.website && (
                      <p style={{ marginTop: "2px", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--fg-3)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <ExternalLink style={{ width: 10, height: 10, flexShrink: 0 }} />
                        {partner.website.replace(/^https?:\/\//, "")}
                      </p>
                    )}
                    {partner.description && (
                      <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--fg-3)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{partner.description}</p>
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
