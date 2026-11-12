import { Button } from "@/components/ui/button";
import { RATING_KEYS, type PlayerSummary } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const SHORT = { passing: "PAS", firstTouch: "TCH", decisions: "DEC" } as const;

export function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}

export function QuarterBadge({ q }: { q: number }) {
  return (
    <span className="rounded-md border border-border bg-secondary px-2 py-0.5 font-display text-xs font-semibold tracking-wider">
      Q{q}
    </span>
  );
}

export function StatusBadge({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-semibold",
        selected ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground",
      )}
    >
      {selected ? "Provisional squad" : "Not selected"}
    </span>
  );
}

export function RatingBlock({ s, large }: { s: PlayerSummary; large?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {RATING_KEYS.map((k) => (
        <div key={k} className="rounded-lg bg-background/50 px-2 py-2 text-center">
          <div className={cn("font-display font-bold leading-none tabular", large ? "text-5xl" : "text-3xl")}>
            {s.latest[k] ?? <span className="text-sm font-medium text-muted-foreground">Not assessed</span>}
          </div>
          <div className="mt-1 text-[11px] font-semibold tracking-widest text-muted-foreground">{SHORT[k]}</div>
        </div>
      ))}
    </div>
  );
}

export function PlayerCard({
  s, reason, suggested, onOpen, index,
}: { s: PlayerSummary; reason: string; suggested: boolean; onOpen: () => void; index: number }) {
  return (
    <article
      style={{ animationDelay: `${index * 25}ms` }}
      className={cn(
        "animate-rise flex flex-col rounded-2xl border border-border p-4",
        s.player.provisional ? "bg-player-card-selected" : "bg-player-card",
        suggested && "shadow-glow",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col items-center">
          <span className="font-display text-4xl font-bold leading-none tabular">
            {s.mean !== null ? s.mean.toFixed(1) : "—"}
          </span>
          <span className="font-display text-sm font-semibold tracking-widest text-primary">{s.player.group}</span>
        </div>
        <div className="flex size-16 items-center justify-center rounded-full border-2 border-primary/60 bg-secondary font-display text-2xl font-bold">
          {initials(s.player.name)}
        </div>
        <div className="flex flex-col items-end gap-1">
          <QuarterBadge q={s.quarter} />
          <span className="text-xs text-muted-foreground tabular">{s.player.id}</span>
        </div>
      </div>
      <h3 className="mt-3 text-center font-display text-xl font-semibold uppercase tracking-wide">{s.player.name}</h3>
      <p className="text-center text-sm text-muted-foreground">{s.player.position}</p>
      <div className="mt-2 flex justify-center"><StatusBadge selected={s.player.provisional} /></div>
      <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">Coach assessments · latest /10</p>
      <div className="mt-1"><RatingBlock s={s} /></div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div><span className="font-semibold tabular">{s.totalMinutes}</span> <span className="text-muted-foreground">min observed</span></div>
        <div className="text-right"><span className="font-semibold tabular">{s.observationDays}</span> <span className="text-muted-foreground">obs. days</span></div>
      </div>
      {suggested && (
        <p className="mt-3 rounded-lg bg-primary/15 px-3 py-2 text-xs font-medium text-primary">
          Suggested for review · {reason}
        </p>
      )}
      <Button className="mt-4 w-full" variant="secondary" onClick={onOpen}>View player</Button>
    </article>
  );
}
