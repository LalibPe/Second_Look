import { useCallback, useEffect, useState } from "react";
import { type ScheduleException } from "./analytics";
import { CONFIG, SEED_DRILLS, type CoachLog, type PlanDrill } from "./data";

const KEY = "second-look-vb:v3";

export interface AppState {
  /** Manual "Coach flagged" marks — independent of the calculated suggestion and the plan. */
  secondLook: Record<string, boolean>;
  /** Visual emphasis only — never changes which cards are shown. */
  highlightSecondLooks: boolean;
  /** Editable demo threshold (% of peer median attempts) for the automatic suggestion. */
  thresholdPct: number;
  recurringDays: number[];
  recurringEffective: string; // date the recurring pattern takes effect
  exceptions: ScheduleException;
  logs: CoachLog[];
  drills: PlanDrill[];
}

export function defaultState(): AppState {
  return {
    secondLook: {},
    highlightSecondLooks: true,
    thresholdPct: CONFIG.secondLookThresholdPct,
    recurringDays: [...CONFIG.defaultPracticeDays],
    recurringEffective: `${CONFIG.demoCalendarStart}-01`,
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
          thresholdPct: typeof parsed.thresholdPct === "number" ? parsed.thresholdPct : base.thresholdPct,
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
