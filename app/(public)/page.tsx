import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 text-white">
      <div className="text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 shadow-2xl">
          <span className="text-4xl font-black text-white">G</span>
        </div>
        <h1 className="mb-3 text-5xl font-black tracking-tight">Deeptech Gigahack</h1>
        <p className="mx-auto mb-2 max-w-xl text-xl text-slate-300">
          Moldova&apos;s largest deeptech hackathon
        </p>
        <p className="mb-10 text-sm text-slate-500">portal.gigahack.md</p>


        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Link href="/login">Register</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-slate-500 bg-slate-800 text-white hover:bg-slate-700 hover:text-white">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
