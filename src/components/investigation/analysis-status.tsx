import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { InvestigationTimeline, type TimelineStep } from "@/components/investigation/investigation-timeline";

export type InvestigationState = "idle" | "validating" | "starting" | "running" | "failed" | "completed";

export function AnalysisStatus({ state, error, steps }: { state: InvestigationState; error?: string | null; steps: TimelineStep[] }) {
  if (state === "idle") return null;
  const completed = state === "completed";
  const failed = state === "failed";
  return <Card className="mt-5 border border-white/10 bg-[#0d111b]"><CardContent className="p-5">
    <div className="flex items-center gap-3">{completed ? <CheckCircle2 className="size-5 text-emerald-300" /> : failed ? <AlertCircle className="size-5 text-red-300" /> : <Loader2 className="size-5 animate-spin text-cyan-300" />}<div><p className="font-medium text-white">{completed ? "Investigation complete" : failed ? "Investigation failed" : state === "validating" ? "Validating issue URL" : state === "starting" ? "Starting analysis" : "Investigation running"}</p><p className="mt-1 text-sm text-slate-500">{error ?? (completed ? "The analysis is ready for review." : "Code Investigator is preparing an evidence-backed investigation.")}</p></div></div>
    {!failed && !completed && steps.length > 0 && <div className="mt-5 border-t border-white/8 pt-5"><InvestigationTimeline steps={steps} /></div>}
    {failed && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-300/[0.06] p-3 text-sm text-red-100">{error}</p>}
  </CardContent></Card>;
}
