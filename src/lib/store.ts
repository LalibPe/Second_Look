import { useCallback, useEffect, useState } from "react";
import { DEFAULT_THRESHOLDS, type PlanItem, type Thresholds } from "./analytics";

const KEY = "second-look:v1";
export interface AppState {
  plan: PlanItem[];
  budget: number;
  thresholds: Thresholds;
}
export const DEFAULT_STATE: AppState = { plan: [], budget: 30, thresholds: DEFAULT_THRESHOLDS };

export function useAppState() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        setState({
          plan: Array.isArray(parsed.plan) ? parsed.plan : [],
          budget: typeof parsed.budget === "number" ? parsed.budget : 30,
          thresholds: { ...DEFAULT_THRESHOLDS, ...parsed.thresholds },
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
    setState(DEFAULT_STATE);
  }, []);

  return { state, setState, reset, hydrated };
}
