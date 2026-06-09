import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { Sidebar } from "@/components/layout/sidebar";
import { ContentTopBar } from "@/components/layout/content-top-bar";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      <Sidebar />
      <div className="flex flex-1 flex-col ml-56 min-h-screen" style={{ background: "var(--bg)" }}>
        <ContentTopBar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
