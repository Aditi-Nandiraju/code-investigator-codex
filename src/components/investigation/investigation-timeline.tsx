import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";

export type TimelineStep = {
  id: string;
  order: number;
  label: string;
  status: string;
  detail?: string | null;
};

const statusStyles: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  DONE: { icon: CheckCircle2, className: "text-emerald-300" },
  ACTIVE: { icon: Loader2, className: "text-cyan-300 animate-spin" },
  FAILED: { icon: XCircle, className: "text-red-300" },
  PENDING: { icon: CircleDashed, className: "text-slate-500" },
};

export function InvestigationTimeline({ steps }: { steps: TimelineStep[] }) {
  const ordered = [...steps].sort((a, b) => a.order - b.order);

  return (
    <ol className="space-y-4">
      {ordered.map((step) => {
        const style = statusStyles[step.status] ?? statusStyles.PENDING;
        const Icon = style.icon;
        return (
          <li key={step.id} className="flex items-start gap-3">
            <Icon className={`mt-0.5 size-4 shrink-0 ${style.className}`} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{step.label}</p>
              {step.detail && <p className="mt-0.5 text-xs leading-5 text-slate-500">{step.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
