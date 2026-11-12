import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, monthGrid, type ScheduleEvent } from "@/lib/analytics";
import { CONFIG } from "@/lib/data";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface CalendarDayInfo {
  events: ScheduleEvent[]; // scheduled sessions that day (may be empty)
  hasPlayerActivity: boolean; // player has a saved log or measured observation that day
}

interface Props {
  startMonth: string; // YYYY-MM
  infoFor: (date: string) => CalendarDayInfo;
  selected: string | null;
  onSelect: (date: string) => void;
  renderDayLabel?: (date: string) => string;
}

/** Monthly calendar with one square per date. Scheduled practices are outlined,
 *  games/tournaments get a filled burgundy marker, and dates with player activity are filled. */
export function MonthCalendar({ startMonth, infoFor, selected, onSelect, renderDayLabel }: Props) {
  const [y, m] = startMonth.split("-").map(Number);
  const [cursor, setCursor] = useState({ year: y!, month: m! - 1 });

  const shift = (delta: number) =>
    setCursor((c) => {
      const d = new Date(Date.UTC(c.year, c.month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });

  const weeks = monthGrid(cursor.year, cursor.month);
  const title = new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleDateString("en-GB", {
    month: "long", year: "numeric", timeZone: "UTC",
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <Button size="icon" variant="ghost" aria-label="Previous month" onClick={() => shift(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <h4 className="font-display text-lg font-semibold uppercase tracking-wide">{title}</h4>
        <Button size="icon" variant="ghost" aria-label="Next month" onClick={() => shift(1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {weeks.flat().map((date, i) => {
          if (!date) return <span key={`x${i}`} className="aspect-square" />;
          const info = infoFor(date);
          const active = info.events.filter((e) => !e.cancelled);
          const isGame = active.some((e) => e.type !== "practice");
          const isPractice = active.some((e) => e.type === "practice");
          const label =
            renderDayLabel?.(date) ??
            `${formatDate(date, { weekday: "long", month: "long", day: "numeric" })}` +
              (active.length ? ` · ${active.map((e) => CONFIG.sessionTypes[e.type]).join(", ")}` : " · nothing scheduled") +
              (info.hasPlayerActivity ? " · has logged activity" : "");
          return (
            <button
              key={date}
              aria-label={label}
              onClick={() => onSelect(date)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-sm border text-sm tabular transition-colors",
                info.hasPlayerActivity
                  ? "border-primary bg-primary text-primary-foreground"
                  : isGame
                    ? "border-primary bg-accent text-accent-foreground"
                    : isPractice
                      ? "border-primary/60 bg-card"
                      : "border-border/50 bg-transparent text-muted-foreground",
                selected === date && "ring-2 ring-ring ring-offset-1 ring-offset-background",
              )}
            >
              <span>{Number(date.slice(8, 10))}</span>
              {isGame && <span className="mt-0.5 size-1.5 rounded-full bg-current" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-primary/60" /> Scheduled practice</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-primary bg-accent" /> Game / tournament</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-primary" /> Logged activity</span>
      </div>
    </div>
  );
}
