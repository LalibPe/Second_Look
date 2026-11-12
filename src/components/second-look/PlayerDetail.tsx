import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  assessmentLabel, attemptsPer60, birthQuarter, formatDate, logAttempts, observationsFor, peerComparison,
  primarySkill, skillEvidence, skillTotals, suggestionReason,
  type PeerComparisonResult, type ScheduleEvent, type SecondLookSuggestion,
} from "@/lib/analytics";
import { CONFIG, SKILL_KEYS, type CoachLog, type PlanDrill, type Player, type SkillKey } from "@/lib/data";
import { PlayerAvatar, StatusBadge } from "./PlayerCard";
import { SkillChart } from "./SkillChart";
import { MonthCalendar, type CalendarDayInfo } from "./MonthCalendar";

interface Props {
  player: Player | null;
  logs: CoachLog[];
  schedule: ScheduleEvent[];
  drills: PlanDrill[];
  suggestion: SecondLookSuggestion | null;
  flagged: boolean;
  onToggleFlagged: (on: boolean) => void;
  onClose: () => void;
  onLogSession: (date: string) => void;
  onEditDrill: (playerId: string, skill: SkillKey) => void;
}

/** Peer comparison block for one role-relevant skill: attempts vs median, outcome kept separate. */
function ComparisonPanel({ player, skill }: { player: Player; skill: SkillKey }) {
  const [showPeers, setShowPeers] = useState(false);
  const r: PeerComparisonResult = peerComparison(player.id, skill);
  const totals = skillTotals(player.id, skill);
  const { label, unit } = CONFIG.skills[skill];

  return (
    <div className="rounded-sm border border-border bg-background p-3 text-sm">
      <div className="font-semibold">{label}</div>
      {r.ok ? (
        <>
          <p className="mt-1 tabular">
            <b>{r.comparison.playerAttempts} attempts</b> vs <b>{r.comparison.median} peer median</b>
            <span className="text-muted-foreground"> · {r.comparison.peers} comparable Q{birthQuarter(player.birthDate)} {player.position.toLowerCase()}s</span>
          </p>
          <p className="mt-0.5 text-muted-foreground tabular">
            Outcome: {totals.successes} of {totals.attempts} {unit} ({totals.pct!.toFixed(1)}%)
          </p>
          <button
            className="mt-1 text-xs font-medium text-primary underline"
            onClick={() => setShowPeers((v) => !v)}
            aria-expanded={showPeers}
          >
            {showPeers ? "Hide" : "Show"} the peer attempt counts behind the median
          </button>
          {showPeers && (
            <p className="mt-1 text-xs text-muted-foreground tabular">
              Anonymized peers, total {label.toLowerCase()} attempts in the same session types:{" "}
              {[...r.comparison.peerAttempts].sort((a, b) => a - b).join(", ")}
            </p>
          )}
        </>
      ) : (
        <p className="mt-1 text-muted-foreground">{r.reason} The automatic suggestion stays unset.</p>
      )}
    </div>
  );
}

export function PlayerDetail({
  player, logs, schedule, drills, suggestion, flagged, onToggleFlagged, onClose, onLogSession, onEditDrill,
}: Props) {
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => setDay(null), [player?.id]);

  const obs = player ? observationsFor(player.id) : [];
  const playerLogs = player ? logs.filter((l) => l.playerId === player.id) : [];
  const playerDrills = player ? drills.filter((d) => d.playerId === player.id) : [];
  const compareSkills = player
    ? SKILL_KEYS.filter((k) => skillTotals(player.id, k).attempts > 0)
    : [];

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
                <PlayerAvatar player={player} className="size-20 rounded-md" textClass="text-3xl" />
                <div className="min-w-0 flex-1">
                  <DialogTitle className="font-display text-3xl font-semibold uppercase tracking-wide">{player.name}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {player.position} · born {formatDate(player.birthDate, { month: "long", year: "numeric" })} · birth quarter Q{birthQuarter(player.birthDate)}
                  </DialogDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge selected={player.provisional} />
                    {suggestion && (
                      <span className="rounded-sm bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        Suggested for second look
                      </span>
                    )}
                    {playerDrills.length > 0 && (
                      <span className="rounded-sm border border-primary/50 px-2 py-0.5 text-xs font-semibold text-primary">
                        Follow-up scheduled
                      </span>
                    )}
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Checkbox
                        checked={flagged}
                        onCheckedChange={(c) => onToggleFlagged(c === true)}
                        aria-label="Coach flagged"
                      />
                      Coach flagged
                    </label>
                  </div>
                </div>
              </div>

              {suggestion && (
                <div className="mt-4 rounded-sm border border-primary/50 bg-accent p-3 text-sm">
                  <div className="font-semibold text-accent-foreground">Why a second look is suggested</div>
                  <p className="mt-1 text-accent-foreground">{suggestionReason(player, suggestion)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {suggestion.playerAttempts} is below {suggestion.thresholdPct}% of {suggestion.median} ({Math.round(suggestion.cutoff)}).
                    Compared only with players of the same birth quarter, position and session type. The coach makes the final decision.
                  </p>
                </div>
              )}

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

            {compareSkills.length > 0 && (
              <section className="rounded-md border border-border bg-card p-4">
                <h3 className="font-display text-lg font-semibold uppercase tracking-wide">Opportunity vs peers</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recorded attempts against the median for players of the same birth quarter, position and session type
                  in the tryout window. Follow-up logs never change this comparison.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {compareSkills.map((k) => <ComparisonPanel key={k} player={player} skill={k} />)}
                </div>
              </section>
            )}

            {playerDrills.length > 0 && (
              <section className="rounded-md border border-border bg-card p-4">
                <h3 className="font-display text-lg font-semibold uppercase tracking-wide">Follow-up plan</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Planned reps are targets only — recorded outcomes stay separate.
                </p>
                <ul className="mt-3 space-y-2">
                  {playerDrills.map((d) => (
                    <li key={`${d.playerId}:${d.skill}`} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border bg-background p-3 text-sm">
                      <span className="tabular">
                        <b>{CONFIG.skills[d.skill].label}</b> · {d.reps} target reps{d.note && ` · ${d.note}`}
                      </span>
                      <Button size="sm" variant="secondary" onClick={() => onEditDrill(d.playerId, d.skill)}>
                        Edit drill
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

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
                    {dayLogs.map((l) => {
                      const per60 = attemptsPer60(l);
                      return (
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
                          {(l.minutes ?? 0) > 0 && (
                            <div className="tabular">
                              Court time: {l.minutes} min · {logAttempts(l)} attempts
                              {per60 !== null && ` · ${per60.toFixed(1)} attempts per 60`}
                            </div>
                          )}
                          {l.comment && <p className="mt-1 italic text-muted-foreground">“{l.comment}”</p>}
                        </div>
                      );
                    })}
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
