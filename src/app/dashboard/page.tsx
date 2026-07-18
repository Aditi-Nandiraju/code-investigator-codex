import { redirect } from "next/navigation";
import { ArrowUpRight, Search } from "lucide-react";

import { signOutUser } from "@/app/actions/auth";
import { StartInvestigationCard } from "@/components/dashboard/start-investigation-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const name = session.user.name ?? session.user.login ?? "there";

  return (
    <main className="min-h-screen bg-[#07090f] text-slate-100">
      <header className="border-b border-white/10 bg-[#0a0d15]/80 px-6 py-4 backdrop-blur lg:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
              <Search className="size-4" />
            </div>
            <span className="font-semibold tracking-tight">Code <span className="text-cyan-300">Investigator</span></span>
          </div>
          <form action={signOutUser}>
            <Button type="submit" variant="ghost" className="text-slate-300 hover:bg-white/8 hover:text-white">Sign out</Button>
          </form>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-24">
        <p className="mb-4 text-sm font-medium text-cyan-300">INVESTIGATION WORKSPACE</p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Welcome back, {name}.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-400">
          Connect an issue when you are ready. Code Investigator will build an evidence-backed path to a fix.
        </p>

        <StartInvestigationCard />

        <div className="mt-5">
          <Card className="border border-white/10 bg-[#0d111b]">
            <CardHeader>
              <CardTitle className="text-white">Your queue</CardTitle>
              <CardDescription className="text-slate-400">No investigations yet.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-slate-500">
              Analysis history will appear here <ArrowUpRight className="size-4" />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
