import { Check, FileCode2, Search } from "lucide-react";

const findings = [
  { file: "src/auth/session.ts", score: "94%", reason: "Session expiry is handled here" },
  { file: "src/api/token/route.ts", score: "88%", reason: "The failing refresh path enters here" },
  { file: "src/lib/cookies.ts", score: "71%", reason: "Related persistence dependency" },
];

export function InvestigationPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#0c1019]/95 p-3 shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <div className="rounded-xl border border-white/8 bg-[#090c13] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-5">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-cyan-300">ISSUE INVESTIGATION</p>
            <h2 className="mt-2 text-base font-medium text-slate-100">Token refresh fails after idle session</h2>
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs font-medium text-emerald-200">Evidence mapped</span>
        </div>

        <div className="mt-5 flex gap-3 text-sm text-slate-400">
          <Search className="mt-0.5 size-4 shrink-0 text-cyan-300" />
          <p>Found 3 files with direct execution-path evidence.</p>
        </div>

        <div className="mt-5 space-y-3">
          {findings.map((finding) => (
            <div key={finding.file} className="rounded-lg border border-white/8 bg-white/[0.025] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-200">
                  <FileCode2 className="size-4 shrink-0 text-cyan-300" />
                  <span className="truncate">{finding.file}</span>
                </div>
                <span className="text-xs font-medium text-cyan-300">{finding.score}</span>
              </div>
              <p className="mt-2 pl-6 text-xs text-slate-500">{finding.reason}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2.5 text-xs text-cyan-100">
          <Check className="size-4 text-cyan-300" />
          Implementation plan ready for review
        </div>
      </div>
    </div>
  );
}
