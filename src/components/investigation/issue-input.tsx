"use client";

import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function IssueInput({ value, onChange, onSubmit, disabled }: { value: string; onChange: (value: string) => void; onSubmit: () => void; disabled?: boolean }) {
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && value.trim()) onSubmit();
      }}
    >
      <label htmlFor="issue-url" className="text-sm font-medium text-slate-200">GitHub issue URL</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input id="issue-url" value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://github.com/owner/repo/issues/42" disabled={disabled} className="h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20 disabled:opacity-50" />
        </div>
        <Button type="submit" disabled={disabled || !value.trim()} className="h-11 bg-cyan-300 text-slate-950 hover:bg-cyan-200">Analyze issue</Button>
      </div>
      <p className="text-xs text-slate-500">Paste an issue from the repository selected for this investigation.</p>
    </form>
  );
}
