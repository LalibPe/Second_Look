import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  assessmentLabel, birthQuarter, formatDate, observationsFor, primarySkill, skillEvidence, skillTotals,
  type ScheduleEvent,
} from "@/lib/analytics";
import { CONFIG, SKILL_KEYS, type CoachLog, type Player } from "@/lib/data";
import { initials, StatusBadge } from "./PlayerCard";
import { SkillChart } from "./SkillChart";
import { MonthCalendar, type CalendarDayInfo } from "./MonthCalendar";

interface Props {
  player: Player | null;
  logs: CoachLog[];
  schedule: ScheduleEvent[];
  secondLook: boolean;
  onToggleSecondLook: (on: boolean) => void;
  onClose: () => void;
  onLogSession: (date: string) => void;
}

export function PlayerDetail({ player, logs, schedule, secondLook, onToggleSecondLook, onClose, onLogSession }: Props) {
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => setDay(null), [player?.id]);

  const obs = player ? observationsFor(player.id) : [];
  const playerLogs = player ? logs.filter((l) => l.playerId === player.id) : [];

  const infoFor = (date: string): CalendarDayInfo => ({
    events: schedule.filter((e) => e.date === date),
    hasPlayerActivity: obs.some((o) => o.date === date) || playerLogs.some((l) => l.date === date),
  });

  const dayObs = day ? obs.filter((o) => o.date === day) : [];
  const dayLogs = day ? playerLogs.filter((l) => l.date === day) : [];
  const dayEvents = day ? schedule.filter((e) => e.date === day) : [];

  return (
    <Dialog open={!!player} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto rounded-none border-border bg-background p-4 sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-md sm:p-6">
        {player && (
          <div className="space-y-5">
            <div className="rounded-md border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-full border border-primary/40 bg-accent font-display text-2xl font-bold text-accent-foreground">
                  {initials(player.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="font-display text-3xl font-semibold uppercase tracking-wide">{player.name}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {player.position} · born {formatDate(player.birthDate, { month: "long", year: "numeric" })} · birth quarter Q{birthQuarter(player.birthDate)}
                  </DialogDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge selected={player.provisional} />
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Checkbox
                        checked={secondLook}
                        onCheckedChange={(c) => onToggleSecondLook(c === true)}
                        aria-label="Needs second look"
                      />
                      Needs second look
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                {SKILL_KEYS.map((k) => {
                  const t = skillTotals(player.id, k, logs);
                  return (
                    <div key={k} className="rounded-sm border border-border bg-background px-3 py-2 text-sm">
                      <div className="font-semibold">{CONFIG.skills[k].label}</div>
                      {t.attempts > 0 ? (
                        <div className="tabular">{t.successes} of {t.attempts} {CONFIG.skills[k].unit} · {t.pct!.toFixed(1)}%</div>
                      ) : (
                        <div className="text-muted-foreground">Not recorded</div>
                      )}
                    </div>
                  );
                })}
              </div>
              {primarySkill(player.id, logs) && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Strongest evidence: {skillEvidence(player.id, primarySkill(player.id, logs)!, logs)}
                </p>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SkillChart playerId={player.id} logs={logs} highlightDate={day} />
              <section className="rounded-md border border-border bg-card p-4">
                <h3 className="font-display text-lg font-semibold uppercase tracking-wide">Session calendar</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Filled squares are days with saved activity for {player.name.split(" ")[0]}. Click a date for details.
                </p>
                <div className="mt-3">
                  <MonthCalendar startMonth={CONFIG.demoCalendarStart} infoFor={infoFor} selected={day} onSelect={(d) => setDay(day === d ? null : d)} />
                </div>
                {day && (
                  <div className="mt-4 space-y-3 border-t border-border pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold">{formatDate(day, { weekday: "long", month: "long", day: "numeric" })}</div>
                      <Button size="sm" variant="secondary" onClick={() => onLogSession(day)}>Log session</Button>
                    </div>
                    {dayEvents.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled this day.</p>}
                    {dayEvents.map((e) => (
                      <p key={e.id} className="text-sm">
                        <b>{CONFIG.sessionTypes[e.type]}</b> · {e.time} · {e.title}
                        {e.cancelled && <span className="text-destructive"> · cancelled</span>}
                      </p>
                    ))}
                    {dayObs.map((o) => (
                      <div key={o.id} className="rounded-sm bg-secondary p-3 text-sm">
                        <div className="font-semibold">Measured skills</div>
                        {SKILL_KEYS.filter((k) => o.skills[k]).map((k) => (
                          <div key={k} className="tabular">
                            {CONFIG.skills[k].label}: {o.skills[k]!.successes} of {o.skills[k]!.attempts} {CONFIG.skills[k].unit}
                          </div>
                        ))}
                        <p className="mt-1 italic text-muted-foreground">“{o.note}”</p>
                      </div>
                    ))}
                    {dayLogs.map((l) => (
                      <div key={`${l.playerId}-${l.date}`} className="rounded-sm bg-secondary p-3 text-sm">
                        <div className="font-semibold">
                          Coach log · {CONFIG.sessionTypes[l.sessionType]}
                          {l.assessment !== null && ` · ${l.assessment}/5 ${assessmentLabel(l.assessment)}`}
                        </div>
                        {SKILL_KEYS.filter((k) => l.skills[k]).map((k) => (
                          <div key={k} className="tabular">
                            {CONFIG.skills[k].label}: {l.skills[k]!.successes} of {l.skills[k]!.attempts} {CONFIG.skills[k].unit}
                          </div>
                        ))}
                        {l.comment && <p className="mt-1 italic text-muted-foreground">“{l.comment}”</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
