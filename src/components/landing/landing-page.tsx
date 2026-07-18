import { ArrowRight, BrainCircuit, FileSearch, GitPullRequest, ShieldCheck } from "lucide-react";

import { InvestigationPreview } from "@/components/landing/investigation-preview";
import { SignInButton } from "@/components/landing/sign-in-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  { icon: FileSearch, title: "Trace the evidence", description: "Locate the files, symbols, and execution paths that connect to an issue." },
  { icon: BrainCircuit, title: "Understand the why", description: "Review clear reasoning and confidence signals before changing code." },
  { icon: GitPullRequest, title: "Ship with context", description: "Turn an investigation into an implementation plan and PR-ready narrative." },
];

export function LandingPage() {
  return (
    <main className="overflow-hidden bg-[#07090f] text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[620px] bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.14),transparent_62%)]" />
      <section className="relative z-10 mx-auto min-h-screen max-w-6xl px-6 pb-20 pt-6 lg:px-10">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
              <FileSearch className="size-4" />
            </div>
            <span className="font-semibold tracking-tight">Code <span className="text-cyan-300">Investigator</span></span>
          </div>
          <span className="hidden text-sm text-slate-400 sm:block">For engineering teams who investigate first</span>
        </nav>

        <div className="grid items-center gap-14 pb-16 pt-20 lg:grid-cols-[0.95fr_1.05fr] lg:pb-24 lg:pt-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-1.5 text-xs font-medium text-cyan-100">
              <ShieldCheck className="size-3.5 text-cyan-300" /> Explainable AI for software engineering
            </div>
            <h1 className="mt-7 text-5xl font-semibold tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Evidence first.<br />
              <span className="text-cyan-300">Code second.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
              Code Investigator turns a GitHub issue into an explainable investigation: the relevant code, the reasoning behind it, and a clear path to a safe fix.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <SignInButton />
              <span className="flex items-center gap-1.5 text-sm text-slate-500">Built for thoughtful fixes <ArrowRight className="size-3.5" /></span>
            </div>
          </div>
          <InvestigationPreview />
        </div>

        <div className="border-t border-white/10 pt-12">
          <p className="mb-6 text-xs font-medium tracking-[0.16em] text-slate-500">A CLEARER PATH FROM ISSUE TO FIX</p>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border border-white/10 bg-white/[0.025] transition-colors hover:bg-white/[0.045]">
                <CardHeader>
                  <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-300"><Icon className="size-4" /></div>
                  <CardTitle className="text-base text-white">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-6 text-slate-400">{description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
