import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, nextDayIso, todayIso, weeklySessionCount, type ScheduleEvent } from "@/lib/analytics";
import { CONFIG, type SessionType } from "@/lib/data";
import type { AppState } from "@/lib/store";
import { MonthCalendar } from "./MonthCalendar";
import { toast } from "sonner";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  state: AppState;
  setState: (fn: (s: AppState) => AppState) => void;
  schedule: ScheduleEvent[];
  onLogSession: (date: string) => void;
}

export function ScheduleTab({ state, setState, schedule, onLogSession }: Props) {
  const [day, setDay] = useState<string | null>(null);
  const [addType, setAddType] = useState<SessionType>("practice");
  const [addTitle, setAddTitle] = useState("");
  const [moveTo, setMoveTo] = useState("");

  const today = todayIso();
  const dayEvents = day ? schedule.filter((e) => e.date === day) : [];
  const isFuture = day !== null && day >= today;

  const toggleDay = (d: number) =>
    setState((s) => ({
      ...s,
      recurringDays: s.recurringDays.includes(d) ? s.recurringDays.filter((x) => x !== d) : [...s.recurringDays, d].sort(),
    }));

  const cancel = () =>
    day &&
    setState((s) => ({ ...s, exceptions: { ...s.exceptions, cancels: [...new Set([...s.exceptions.cancels, day])] } }));

  const uncancel = () =>
    day && setState((s) => ({ ...s, exceptions: { ...s.exceptions, cancels: s.exceptions.cancels.filter((d) => d !== day) } }));

  const mark = (type: SessionType) => {
    if (!day) return;
    const title = addTitle.trim() || (type === "game" ? "Game" : "Tournament");
    setState((s) => ({ ...s, exceptions: { ...s.exceptions, marks: { ...s.exceptions.marks, [day]: { type, title } } } }));
    toast.success(`${formatDate(day)} marked as ${CONFIG.sessionTypes[type].toLowerCase()}`);
  };

  const addSession = () => {
    if (!day) return;
    const title = addTitle.trim() || CONFIG.sessionTypes[addType];
    setState((s) => ({
      ...s,
      exceptions: { ...s.exceptions, adds: [...s.exceptions.adds, { id: `oneoff-${day}-${s.exceptions.adds.length}`, date: day, time: "17:30", type: addType, title }] },
    }));
    setAddTitle("");
    toast.success(`Session added on ${formatDate(day)}`);
  };

  const move = () => {
    if (!day || !moveTo) return;
    const ev = dayEvents.find((e) => !e.cancelled);
    if (!ev) return;
    setState((s) => ({
      ...s,
      exceptions: {
        ...s.exceptions,
        cancels: [...new Set([...s.exceptions.cancels, day])],
        adds: [...s.exceptions.adds, { id: `moved-${day}-to-${moveTo}`, date: moveTo, time: ev.time, type: ev.type, title: ev.title }],
      },
    }));
    setMoveTo("");
    toast.success(`Session moved to ${formatDate(moveTo)}`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="rounded-md border border-border bg-card p-5">
        <h2 className="font-display text-xl font-semibold uppercase tracking-wide">Practice schedule</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Outlined squares are scheduled practices from the recurring pattern. Games and tournaments carry a dot marker.
          Historical sessions are always preserved.
        </p>
        <div className="mt-3">
          <MonthCalendar
            startMonth={CONFIG.demoCalendarStart}
            infoFor={(date) => ({ events: schedule.filter((e) => e.date === date), hasPlayerActivity: false })}
            selected={day}
            onSelect={(d) => setDay(day === d ? null : d)}
          />
        </div>
      </section>

      <div className="space-y-4">
        <section className="rounded-md border border-border bg-card p-4">
          <h3 className="font-display text-lg font-semibold uppercase tracking-wide">Recurring practice days</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {weeklySessionCount(state.recurringDays)} session{weeklySessionCount(state.recurringDays) === 1 ? "" : "s"} per week
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <label key={d} className="flex items-center gap-1.5 rounded-sm border border-border px-2 py-1.5 text-sm">
                <Checkbox checked={state.recurringDays.includes(d)} onCheckedChange={() => toggleDay(d)} aria-label={DAY_NAMES[d]} />
                {DAY_NAMES[d]}
              </label>
            ))}
          </div>
          <div className="mt-3">
            <Label htmlFor="effective" className="text-xs">Takes effect from</Label>
            <Input
              id="effective" type="date" className="w-44"
              value={state.recurringEffective}
              min={nextDayIso(today)}
              onChange={(e) => e.target.value && setState((s) => ({ ...s, recurringEffective: e.target.value }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">Defaults to tomorrow; past sessions are never rewritten.</p>
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <h3 className="font-display text-lg font-semibold uppercase tracking-wide">
            {day ? formatDate(day, { weekday: "long", month: "long", day: "numeric" }) : "Pick a date"}
          </h3>
          {!day && <p className="mt-1 text-sm text-muted-foreground">Click a date on the calendar to see its sessions and make one-off changes.</p>}
          {day && (
            <div className="mt-2 space-y-3 text-sm">
              {dayEvents.length === 0 && <p className="text-muted-foreground">Nothing scheduled.</p>}
              {dayEvents.map((e) => (
                <p key={e.id}>
                  <b>{CONFIG.sessionTypes[e.type]}</b> · {e.time} · {e.title}
                  {e.cancelled && <span className="text-destructive"> · cancelled</span>}
                  {e.source === "oneoff" && <span className="text-muted-foreground"> · one-off</span>}
                </p>
              ))}
              <Button size="sm" variant="secondary" onClick={() => onLogSession(day)}>Log session on this date</Button>
              {isFuture && (
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="flex flex-wrap gap-2">
                    {dayEvents.some((e) => !e.cancelled) ? (
                      <Button size="sm" variant="outline" onClick={cancel}>Cancel session</Button>
                    ) : dayEvents.some((e) => e.cancelled) ? (
                      <Button size="sm" variant="outline" onClick={uncancel}>Restore session</Button>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => mark("game")}>Mark as game</Button>
                    <Button size="sm" variant="outline" onClick={() => mark("tournament")}>Mark as tournament</Button>
                  </div>
                  {dayEvents.some((e) => !e.cancelled) && (
                    <div className="flex items-end gap-2">
                      <div>
                        <Label htmlFor="move-to" className="text-xs">Move to</Label>
                        <Input id="move-to" type="date" className="w-40" value={moveTo} min={today} onChange={(e) => setMoveTo(e.target.value)} />
                      </div>
                      <Button size="sm" variant="outline" disabled={!moveTo} onClick={move}>Move</Button>
                    </div>
                  )}
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <Label className="text-xs">Add a session</Label>
                      <Select value={addType} onValueChange={(v) => setAddType(v as SessionType)}>
                        <SelectTrigger className="w-36" aria-label="New session type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(CONFIG.sessionTypes) as SessionType[]).map((t) => (
                            <SelectItem key={t} value={t}>{CONFIG.sessionTypes[t]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input className="w-40" placeholder="Title (optional)" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} aria-label="New session title" />
                    <Button size="sm" variant="outline" onClick={addSession}>Add</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
