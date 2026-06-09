import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getMyPreferences } from "@/lib/actions/notifications";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NotificationPreferencesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const preferences = await getMyPreferences();
  if (!preferences) redirect("/profile");

  return (
    <main className="gh-page">
      <div style={{ margin: "0 auto", maxWidth: "32rem" }}>
        <div className="mb-6">
          <Button asChild variant="ghost">
            <Link href="/profile"><ArrowLeft className="mr-2 h-4 w-4" />Back to Profile</Link>
          </Button>
        </div>
        <p className="gh-kicker mb-1">» Preferences</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "24px", letterSpacing: "-0.02em", marginBottom: "4px" }}>Notification Preferences</h1>
        <p style={{ marginBottom: "24px", fontSize: "13px", color: "var(--fg-3)" }}>Choose which events trigger email notifications. In-app notifications are always on.</p>
        <NotificationPreferencesForm preferences={preferences} />
      </div>
    </main>
  );
}
