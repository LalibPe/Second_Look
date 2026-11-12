import { DEMO_FINAL_DATE, OBSERVATIONS, PLAYERS, type Observation, type Player } from "./demo-data";

export type Quarter = 1 | 2 | 3 | 4;
export type RatingKey = "passing" | "firstTouch" | "decisions";
export const RATING_KEYS: RatingKey[] = ["passing", "firstTouch", "decisions"];
export const RATING_LABELS: Record<RatingKey, string> = {
  passing: "Passing",
  firstTouch: "First touch",
  decisions: "Decision-making",
};

/** January 1 selection-year cutoff. */
export function birthQuarter(birthDate: string): Quarter {
  const month = Number(birthDate.slice(5, 7));
  return (Math.floor((month - 1) / 3) + 1) as Quarter;
}

export function observationsFor(playerId: string, obs: Observation[] = OBSERVATIONS) {
  return obs
    .filter((o) => o.playerId === playerId)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export function latestValue(list: Observation[], key: RatingKey): number | null {
  for (let i = list.length - 1; i >= 0; i--) {
    const v = list[i]![key];
    if (v !== null) return v;
  }
  return null;
}

export interface PlayerSummary {
  player: Player;
  quarter: Quarter;
  observations: Observation[];
  totalMinutes: number;
  observationDays: number;
  latest: Record<RatingKey, number | null>;
  mean: number | null;
}

export function summarize(player: Player, obs: Observation[] = OBSERVATIONS): PlayerSummary {
  const list = observationsFor(player.id, obs);
  const latest = {
    passing: latestValue(list, "passing"),
    firstTouch: latestValue(list, "firstTouch"),
    decisions: latestValue(list, "decisions"),
  };
  const vals = RATING_KEYS.map((k) => latest[k]);
  const mean = vals.every((v) => v !== null)
    ? (vals as number[]).reduce((a, b) => a + b, 0) / 3
    : null;
  return {
    player,
    quarter: birthQuarter(player.birthDate),
    observations: list,
    totalMinutes: list.reduce((a, o) => a + o.minutes, 0),
    observationDays: new Set(list.map((o) => o.date)).size,
    latest,
    mean,
  };
}

export const SUMMARIES: PlayerSummary[] = PLAYERS.map((p) => summarize(p));

export interface Thresholds {
  rating: number; // mean must be at least this
  minutes: number; // total minutes must be below this
}
export const DEFAULT_THRESHOLDS: Thresholds = { rating: 7, minutes: 20 };

export function reviewStatus(s: PlayerSummary, t: Thresholds) {
  if (s.player.provisional) return { suggested: false, reason: "In provisional squad" };
  if (s.mean === null) return { suggested: false, reason: "Not all assessments recorded" };
  const suggested = s.mean >= t.rating - 1e-9 && s.totalMinutes < t.minutes;
  return {
    suggested,
    reason: `${s.mean.toFixed(1)}/10 technical assessment · ${s.totalMinutes} minutes observed`,
  };
}

export function quarterAudit(summaries: PlayerSummary[] = SUMMARIES) {
  return ([1, 2, 3, 4] as Quarter[]).map((q) => {
    const inQ = summaries.filter((s) => s.quarter === q);
    const selected = inQ.filter((s) => s.player.provisional).length;
    return { quarter: q, selected, attended: inQ.length, pct: inQ.length ? (selected / inQ.length) * 100 : 0 };
  });
}

export function passCompletion(list: Observation[]) {
  let comp = 0;
  let att = 0;
  for (const o of list) {
    if (o.passesAttempted === null || o.passesCompleted === null) continue;
    comp += o.passesCompleted;
    att += o.passesAttempted;
  }
  return { completed: comp, attempted: att, pct: att > 0 ? (comp / att) * 100 : null };
}

export function peerComparison(s: PlayerSummary, key: RatingKey, all: PlayerSummary[] = SUMMARIES) {
  const peers = all.filter(
    (p) => p.player.id !== s.player.id && p.quarter === s.quarter && p.player.group === s.player.group,
  );
  const values = peers.map((p) => p.latest[key]).filter((v): v is number => v !== null);
  if (values.length < 3) return { sufficient: false as const, count: values.length };
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return { sufficient: true as const, count: values.length, median, min: sorted[0]!, max: sorted.at(-1)! };
}

/** 28 days ending at the final date of the demo dataset. */
export function calendarDays(end = DEMO_FINAL_DATE): string[] {
  const out: string[] = [];
  const e = new Date(end + "T00:00:00Z");
  for (let i = 27; i >= 0; i--) {
    const d = new Date(e);
    d.setUTCDate(e.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}

// ---------- Plan ----------
export interface PlanItem {
  playerId: string;
  minutes: number;
  focus: string;
}

export function allocated(plan: PlanItem[], excludeId?: string) {
  return plan.filter((p) => p.playerId !== excludeId).reduce((a, p) => a + p.minutes, 0);
}

export function validateMinutes(raw: string, plan: PlanItem[], budget: number, playerId: string): string | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed) || Number(trimmed) <= 0)
    return "Enter a whole number of minutes greater than 0 (for example 10).";
  const remaining = budget - allocated(plan, playerId);
  if (Number(trimmed) > remaining)
    return remaining > 0
      ? `Only ${remaining} min left in the ${budget}-min observation budget. Lower to ${remaining} or raise the budget.`
      : `The ${budget}-min observation budget is fully allocated. Raise the budget or reduce another player's minutes.`;
  return null;
}

export function validateAdd(item: PlanItem, plan: PlanItem[], budget: number): string | null {
  if (plan.some((p) => p.playerId === item.playerId))
    return `${item.playerId} is already in the plan. Edit their minutes in the plan instead.`;
  return validateMinutes(String(item.minutes), plan, budget, item.playerId);
}

export function validateBudget(raw: string, plan: PlanItem[]): string | null {
  if (!/^\d+$/.test(raw.trim()) || Number(raw) <= 0) return "Enter a whole number of minutes greater than 0.";
  const used = allocated(plan);
  if (Number(raw) < used) return `Budget can't be below the ${used} min already allocated. Reduce player minutes first.`;
  return null;
}

export function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function planToCsv(plan: PlanItem[], players: Player[] = PLAYERS): string {
  const header = ["player_id", "player_name", "position", "planned_minutes", "focus"];
  const lines = plan.map((item) => {
    const p = players.find((x) => x.id === item.playerId)!;
    return [p.id, p.name, p.position, item.minutes, item.focus].map(csvEscape).join(",");
  });
  return [header.join(","), ...lines].join("\r\n");
}
