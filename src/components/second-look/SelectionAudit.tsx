import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { quarterAudit } from "@/lib/analytics";
import { PLAYERS, type Quarter } from "@/lib/data";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan–Mar", "Apr–Jun", "Jul–Sep", "Oct–Dec"];

export function SelectionAudit({ active, onSelect }: { active: Quarter | null; onSelect: (q: Quarter | null) => void }) {
  const audit = quarterAudit(PLAYERS); // always the full roster, never the filtered list
  const total = PLAYERS.length;
  const selected = PLAYERS.filter((p) => p.provisional).length;

  return (
    <section className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-xl font-semibold uppercase tracking-wide">Selection audit</h2>
        <Tooltip>
          <TooltipTrigger aria-label="About birth quarters" className="text-muted-foreground hover:text-foreground">
            <Info className="size-4" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Birth quarter describes relative age within the selection year (January 1 cutoff). It gives age context and
            never determines who gets a second look.
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {selected} of {total} trialists are provisionally selected. Every provisional pick so far was born in the first
        half of the year — a pattern worth reviewing before final selection.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {audit.map((a) => (
          <button
            key={a.quarter}
            onClick={() => onSelect(active === a.quarter ? null : a.quarter)}
            aria-pressed={active === a.quarter}
            className={cn(
              "rounded-sm border p-3 text-left transition-colors",
              active === a.quarter ? "border-primary bg-accent" : "border-border hover:bg-secondary",
            )}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-display text-lg font-bold">Q{a.quarter}</span>
              <span className="text-xs text-muted-foreground">{MONTHS[a.quarter - 1]}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${a.pct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-sm tabular">
              <span><b>{a.selected}/{a.attended}</b> selected</span>
              <span className="text-muted-foreground">{Math.round(a.pct)}%</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
