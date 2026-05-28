import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { TopBar } from "@/components/layout/top-bar";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <TopBar />
      <div>{children}</div>
    </div>
  );
}
