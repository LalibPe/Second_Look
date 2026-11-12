import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { calendarDays, formatDate } from "@/lib/analytics";
import type { Observation } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const DAYS = calendarDays();
const HEAT = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];
function level(min: number) {
  if (min === 0) return 0;
  if (min < 10) return 1;
  if (min < 25) return 2;
  if (min < 45) return 3;
  return 4;
}

export function ObsDetail({ o }: { o: Observation }) {
  const ratings = [
    o.passing !== null && `Passing ${o.passing}`,
    o.firstTouch !== null && `First touch ${o.firstTouch}`,
    o.decisions !== null && `Decisions ${o.decisions}`,
  ].filter(Boolean).join(" · ");
  const stats = [
    o.passesAttempted !== null && (o.passesAttempted === 0 ? "No pass attempts" : `Passes ${o.passesCompleted}/${o.passesAttempted}`),
    o.goals !== null && `Goals ${o.goals}`,
  ].filter(Boolean).join(" · ");
  return (
    <div className="text-sm">
      <div className="font-semibold">{o.time} · {o.sessionType} · {o.minutes} min</div>
      <div className="text-muted-foreground">{ratings || "No ratings recorded"}</div>
      {stats && <div className="text-muted-foreground">{stats}</div>}
      <div className="italic">“{o.note}”</div>
    </div>
  );
}

export function ObservationCalendar({
  observations, selected, onSelect,
}: { observations: Observation[]; selected: string | null; onSelect: (d: string | null) => void }) {
  const byDay = (d: string) => observations.filter((o) => o.date === d);
  const weeks = [0, 1, 2, 3].map((w) => DAYS.slice(w * 7, w * 7 + 7));
  const selectedObs = selected ? byDay(selected) : [];

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold uppercase tracking-wide">Observation calendar</h3>
        {selected && <Button size="sm" variant="ghost" onClick={() => onSelect(null)}>Clear highlight</Button>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatDate(DAYS[0]!)} – {formatDate(DAYS[27]!)} · click a day to highlight it on the chart
      </p>
      <div className="mt-4 flex gap-3">
        <div className="grid grid-rows-7 gap-1.5 text-[11px] text-muted-foreground">
          {weeks[0]!.map((d) => (
            <span key={d} className="flex h-7 items-center">{formatDate(d, { weekday: "short" })}</span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-rows-7 gap-1.5">
            {week.map((d) => {
              const list = byDay(d);
              const min = list.reduce((a, o) => a + o.minutes, 0);
              const cell = (
                <button
                  aria-label={list.length ? `${formatDate(d)}: ${min} minutes observed` : `${formatDate(d)}: No observation logged`}
                  disabled={!list.length}
                  onClick={() => onSelect(selected === d ? null : d)}
                  className={cn(
                    "size-7 rounded-md border border-border/60 transition", HEAT[level(min)],
                    list.length && "cursor-pointer hover:ring-2 hover:ring-ring",
                    selected === d && "ring-2 ring-warning",
                  )}
                />
              );
              if (!list.length)
                return (
                  <Tooltip key={d}>
                    <TooltipTrigger asChild><span>{cell}</span></TooltipTrigger>
                    <TooltipContent>{formatDate(d)} · No observation logged</TooltipContent>
                  </Tooltip>
                );
              return (
                <Tooltip key={d}>
                  <TooltipTrigger asChild>{cell}</TooltipTrigger>
                  <TooltipContent className="max-w-xs space-y-2 bg-popover text-popover-foreground border border-border">
                    <div className="font-semibold">{formatDate(d, { weekday: "long", month: "long", day: "numeric" })}</div>
                    {list.map((o) => <ObsDetail key={o.id} o={o} />)}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>0 min</span>
        {HEAT.map((h) => <span key={h} className={cn("size-3.5 rounded-sm border border-border/60", h)} />)}
        <span>45+ min</span>
        <span className="ml-3">Blank = No observation logged</span>
      </div>
      {selected && (
        <div className="mt-4 space-y-2 rounded-xl bg-secondary p-3">
          <div className="text-sm font-semibold">{formatDate(selected, { weekday: "long", month: "long", day: "numeric" })}</div>
          {selectedObs.map((o) => <ObsDetail key={o.id} o={o} />)}
        </div>
      )}
    </section>
  );
}
