import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  formatDate, peerComparison, RATING_KEYS, RATING_LABELS, reviewStatus, type PlanItem, type PlayerSummary, type Thresholds,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { initials, QuarterBadge, RatingBlock, StatusBadge } from "./PlayerCard";
import { ProgressChart } from "./ProgressChart";
import { ObservationCalendar } from "./ObservationCalendar";
import { AddToPlan } from "./PlanControls";

interface Props {
  s: PlayerSummary | null;
  onClose: () => void;
  thresholds: Thresholds;
  plan: PlanItem[];
  budget: number;
  onAdd: (i: PlanItem) => void;
  onRemove: (id: string) => void;
}

export function PlayerDetail({ s, onClose, thresholds, plan, budget, onAdd, onRemove }: Props) {
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => setDay(null), [s?.player.id]);
  const status = s ? reviewStatus(s, thresholds) : null;

  return (
    <Dialog open={!!s} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto rounded-none border-border bg-background p-4 sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-2xl sm:p-6">
        {s && status && (
          <div className="space-y-5">
            <div className={cn("rounded-2xl border border-border p-5", s.player.provisional ? "bg-player-card-selected" : "bg-player-card")}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex size-20 items-center justify-center rounded-full border-2 border-primary/60 bg-secondary font-display text-3xl font-bold">
                  {initials(s.player.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="font-display text-3xl font-bold uppercase tracking-wide">{s.player.name}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {s.player.id} · {s.player.position} · born {formatDate(s.player.birthDate, { month: "long", year: "numeric" })}
                  </DialogDescription>
                  <div className="mt-2 flex flex-wrap gap-2"><QuarterBadge q={s.quarter} /><StatusBadge selected={s.player.provisional} /></div>
                </div>
                <div className="flex gap-6 text-center">
                  <div><div className="font-display text-4xl font-bold tabular" data-testid="detail-minutes">{s.totalMinutes}</div><div className="text-xs text-muted-foreground">min observed</div></div>
                  <div><div className="font-display text-4xl font-bold tabular" data-testid="detail-days">{s.observationDays}</div><div className="text-xs text-muted-foreground">obs. days</div></div>
                  <div><div className="font-display text-4xl font-bold tabular">{s.mean?.toFixed(1) ?? "—"}</div><div className="text-xs text-muted-foreground">mean /10</div></div>
                </div>
              </div>
              <p className="mt-4 text-[11px] uppercase tracking-widest text-muted-foreground">Coach assessments · latest /10</p>
              <div className="mt-1"><RatingBlock s={s} large /></div>
              {status.suggested && (
                <p className="mt-3 rounded-lg bg-primary/15 px-3 py-2 text-sm font-medium text-primary">Suggested for review · {status.reason}</p>
              )}
            </div>

            <AddToPlan key={s.player.id} playerId={s.player.id} plan={plan} budget={budget} onAdd={onAdd} onRemove={onRemove} />

            <div className="grid gap-4 lg:grid-cols-2">
              <ProgressChart observations={s.observations} highlightDate={day} />
              <ObservationCalendar observations={s.observations} selected={day} onSelect={setDay} />
            </div>

            <section className="rounded-2xl border border-border bg-card p-4">
              <h3 className="font-display text-lg font-semibold uppercase tracking-wide">Peer context</h3>
              <p className="text-sm text-muted-foreground">
                Descriptive only: latest assessments of other Q{s.quarter} {s.player.group} trialists.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {RATING_KEYS.map((k) => {
                  const pc = peerComparison(s, k);
                  return (
                    <div key={k} className="rounded-xl bg-secondary p-3 text-sm">
                      <div className="font-semibold">{RATING_LABELS[k]}</div>
                      {pc.sufficient ? (
                        <div className="tabular">Player {s.latest[k] ?? "—"} · peer median {pc.median} (range {pc.min}–{pc.max}) · {pc.count} peers</div>
                      ) : (
                        <div className="text-muted-foreground">Insufficient comparable observations ({pc.count} peer{pc.count === 1 ? "" : "s"}, need 3)</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
              <h3 className="font-display text-lg font-semibold uppercase tracking-wide">Observation history</h3>
              <ul className="mt-2 divide-y divide-border">
                {[...s.observations].reverse().map((o) => (
                  <li key={o.id} className="py-2 text-sm">
                    <span className="font-semibold">{formatDate(o.date, { weekday: "short", month: "short", day: "numeric" })} {o.time}</span>
                    <span className="text-muted-foreground"> · {o.sessionType} · {o.minutes} min</span>
                    <p>“{o.note}”</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
