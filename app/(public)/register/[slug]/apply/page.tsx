import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

// The separate "apply" flow has been retired. Registration now happens
// automatically during onboarding (profile → ticket verification → auto-registered
// to the single active event). This route only redirects, to keep old links working.
export default async function EventApplyPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signup");
  }
  redirect("/onboarding");
}
