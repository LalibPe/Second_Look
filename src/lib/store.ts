import { useCallback, useEffect, useState } from "react";
import { nextDayIso, todayIso, type ScheduleException } from "./analytics";
import { CONFIG, SEED_DRILLS, type CoachLog, type PlanDrill } from "./data";

const KEY = "second-look-vb:v1";

export interface AppState {
  /** Coach-controlled "needs second look" flags, seeded from scheduled_drills.json. */
  secondLook: Record<string, boolean>;
  /** Visual emphasis only — never changes which cards are shown. */
  highlightSecondLooks: boolean;
  recurringDays: number[];
  recurringEffective: string; // date the recurring pattern takes effect
  exceptions: ScheduleException;
  logs: CoachLog[];
  drills: PlanDrill[];
}

export function defaultState(): AppState {
  return {
    secondLook: Object.fromEntries(SEED_DRILLS.map((d) => [d.playerId, true])),
    highlightSecondLooks: true,
    recurringDays: [...CONFIG.defaultPracticeDays],
    recurringEffective: nextDayIso(todayIso()),
    exceptions: { cancels: [], adds: [], marks: {} },
    logs: [],
    drills: SEED_DRILLS.map((d) => ({ ...d })),
  };
}

export function useAppState() {
  const [state, setState] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        const base = defaultState();
        setState({
          secondLook: { ...base.secondLook, ...parsed.secondLook },
          highlightSecondLooks: parsed.highlightSecondLooks ?? base.highlightSecondLooks,
          recurringDays: Array.isArray(parsed.recurringDays) ? parsed.recurringDays : base.recurringDays,
          recurringEffective: parsed.recurringEffective ?? base.recurringEffective,
          exceptions: { ...base.exceptions, ...parsed.exceptions },
          logs: Array.isArray(parsed.logs) ? parsed.logs : [],
          drills: Array.isArray(parsed.drills) ? parsed.drills : base.drills,
        });
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    setState(defaultState());
  }, []);

  return { state, setState, reset, hydrated };
}
