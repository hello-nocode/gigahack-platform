import { auth, signOut } from "@/lib/auth/config";
import { db } from "@db/index";
import { notifications } from "@db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { LogOut } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { PageTitle } from "@/components/layout/page-title";

export async function ContentTopBar() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;

  const [myNotifications, unreadCount] = await Promise.all([
    db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50),
    db.select({ id: notifications.id }).from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
      .then((r) => r.length),
  ]);

  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between px-6"
      style={{
        background: "var(--ink-900)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      {/* Left — dynamic page title */}
      <PageTitle />

      {/* Right — notification bell + sign-out */}
      <div className="flex items-center gap-1">
        <NotificationBell notifications={myNotifications} unreadCount={unreadCount} />

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            aria-label="Sign out"
            className="gh-btn-ghost flex h-9 w-9 items-center justify-center transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
