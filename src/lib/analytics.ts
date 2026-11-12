import {
  CONFIG, OBSERVATIONS, PLAYERS, SESSIONS, SKILL_KEYS,
  type CoachLog, type ObservationEntry, type PlanDrill, type Player, type Quarter,
  type SessionEvent, type SessionType, type SkillKey, type SkillStat,
} from "./data";

/** January 1 selection-year cutoff. */
export function birthQuarter(birthDate: string): Quarter {
  const month = Number(birthDate.slice(5, 7));
  return (Math.floor((month - 1) / 3) + 1) as Quarter;
}

export function playerById(id: string): Player {
  return PLAYERS.find((p) => p.id === id)!;
}

export function observationsFor(playerId: string, obs: ObservationEntry[] = OBSERVATIONS) {
  return obs
    .filter((o) => o.playerId === playerId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Selection audit derived from the full roster (never from a filtered list). */
export function quarterAudit(players: Player[] = PLAYERS) {
  return ([1, 2, 3, 4] as Quarter[]).map((q) => {
    const inQ = players.filter((p) => birthQuarter(p.birthDate) === q);
    const selected = inQ.filter((p) => p.provisional).length;
    return { quarter: q, selected, attended: inQ.length, pct: inQ.length ? (selected / inQ.length) * 100 : 0 };
  });
}

// ---------- Skill rates ----------

/** Sum attempts/successes for one skill across measured observations and coach logs. */
export function skillTotals(
  playerId: string,
  skill: SkillKey,
  logs: CoachLog[] = [],
  obs: ObservationEntry[] = OBSERVATIONS,
): SkillStat & { pct: number | null } {
  let attempts = 0;
  let successes = 0;
  const add = (s?: SkillStat) => {
    if (!s) return;
    attempts += s.attempts;
    successes += s.successes;
  };
  for (const o of obs) if (o.playerId === playerId) add(o.skills[skill]);
  for (const l of logs) if (l.playerId === playerId) add(l.skills[skill]);
  return { attempts, successes, pct: attempts > 0 ? (successes / attempts) * 100 : null };
}

/** One sentence of evidence for a roster card, e.g. "Serve receive · 9 of 13 to target". */
export function skillEvidence(playerId: string, skill: SkillKey, logs: CoachLog[] = []): string | null {
  const t = skillTotals(playerId, skill, logs);
  if (t.attempts === 0) return null;
  const { label, unit } = CONFIG.skills[skill];
  return `${label} · ${t.successes} of ${t.attempts} ${unit}`;
}

/** The skill with the most recorded attempts for a player (for the card evidence line). */
export function primarySkill(playerId: string, logs: CoachLog[] = []): SkillKey | null {
  let best: SkillKey | null = null;
  let bestAttempts = 0;
  for (const k of Object.keys(CONFIG.skills) as SkillKey[]) {
    const t = skillTotals(playerId, k, logs);
    if (t.attempts > bestAttempts) {
      best = k;
      bestAttempts = t.attempts;
    }
  }
  return best;
}

export interface ChartPoint {
  date: string;
  value: number | null; // success rate %, or 1–5 assessment
  attempts?: number;
  successes?: number;
  assessment?: number | null;
}

/** Per-date success-rate series for one skill, combining measured observations and coach logs. */
export function skillSeries(playerId: string, skill: SkillKey, logs: CoachLog[] = []): ChartPoint[] {
  const byDate = new Map<string, SkillStat>();
  const add = (date: string, s?: SkillStat) => {
    if (!s) return;
    const cur = byDate.get(date) ?? { attempts: 0, successes: 0 };
    cur.attempts += s.attempts;
    cur.successes += s.successes;
    byDate.set(date, cur);
  };
  for (const o of OBSERVATIONS) if (o.playerId === playerId) add(o.date, o.skills[skill]);
  for (const l of logs) if (l.playerId === playerId) add(l.date, l.skills[skill]);
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, s]) => ({
      date,
      value: s.attempts > 0 ? (s.successes / s.attempts) * 100 : null,
      attempts: s.attempts,
      successes: s.successes,
    }));
}

/** Per-date coach assessment series (1–5), from saved logs only. Gaps stay gaps. */
export function assessmentSeries(playerId: string, logs: CoachLog[]): ChartPoint[] {
  return logs
    .filter((l) => l.playerId === playerId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => ({ date: l.date, value: l.assessment, assessment: l.assessment }));
}

export function assessmentLabel(score: number): string {
  return CONFIG.assessmentScale[String(score)] ?? String(score);
}

// ---------- Second-look rule ----------

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Role-relevant skills for a position (from app_config.json), falling back to all skills. */
export function roleSkills(position: string): SkillKey[] {
  return CONFIG.roleSkills[position] ?? SKILL_KEYS;
}

export interface PeerComparison {
  skill: SkillKey;
  playerAttempts: number;
  peerAttempts: number[]; // anonymized totals behind the median
  median: number;
  peers: number;
}

export type PeerComparisonResult =
  | { ok: true; comparison: PeerComparison }
  | { ok: false; reason: string };

const MIN_PEERS = 3;

/**
 * Compare one player's recorded attempts with peers of the same birth quarter and
 * position, in the same session types, using only the historical tryout window
 * (observations.json — coach logs from follow-up sessions never enter the benchmark).
 * The player is excluded from their own benchmark.
 */
export function peerComparison(playerId: string, skill: SkillKey): PeerComparisonResult {
  const player = playerById(playerId);
  const quarter = birthQuarter(player.birthDate);
  const sessionTypeById = new Map(SESSIONS.map((s) => [s.id, s.type]));

  // Session types in which this player had the skill measured during tryouts.
  const playerObs = OBSERVATIONS.filter((o) => o.playerId === playerId && o.skills[skill]);
  const types = new Set(playerObs.map((o) => sessionTypeById.get(o.sessionId)));
  const playerAttempts = playerObs.reduce((n, o) => n + o.skills[skill]!.attempts, 0);
  if (playerAttempts === 0)
    return { ok: false, reason: `No ${CONFIG.skills[skill].label.toLowerCase()} attempts recorded for ${player.name} in the tryout window.` };

  const peerAttempts = PLAYERS.filter(
    (p) => p.id !== playerId && p.position === player.position && birthQuarter(p.birthDate) === quarter,
  ).map((p) =>
    OBSERVATIONS.filter(
      (o) => o.playerId === p.id && o.skills[skill] && types.has(sessionTypeById.get(o.sessionId)),
    ).reduce((n, o) => n + o.skills[skill]!.attempts, 0),
  ).filter((n) => n > 0);

  if (peerAttempts.length < MIN_PEERS)
    return {
      ok: false,
      reason: `Only ${peerAttempts.length} comparable peer${peerAttempts.length === 1 ? "" : "s"} (same quarter, position and session type) with recorded ${CONFIG.skills[skill].label.toLowerCase()} attempts — at least ${MIN_PEERS} are needed for a median.`,
    };

  return {
    ok: true,
    comparison: { skill, playerAttempts, peerAttempts, median: median(peerAttempts), peers: peerAttempts.length },
  };
}

export interface SecondLookSuggestion extends PeerComparison {
  thresholdPct: number;
  cutoff: number; // thresholdPct% of the peer median
}

/**
 * Automatic second-look suggestion: a player outside the tentative squad whose
 * recorded attempts in a role-relevant skill fall below thresholdPct% of the peer
 * median. A low success rate never triggers this rule. Returns null when the player
 * is selected, has enough opportunities, or the comparison data is insufficient.
 */
export function secondLookSuggestion(player: Player, thresholdPct: number): SecondLookSuggestion | null {
  if (player.provisional) return null;
  let best: SecondLookSuggestion | null = null;
  for (const skill of roleSkills(player.position)) {
    const r = peerComparison(player.id, skill);
    if (!r.ok) continue;
    const c = r.comparison;
    const cutoff = (thresholdPct / 100) * c.median;
    if (c.playerAttempts < cutoff) {
      const cand = { ...c, thresholdPct, cutoff };
      if (!best || c.playerAttempts / c.median < best.playerAttempts / best.median) best = cand;
    }
  }
  return best;
}

/** Human-readable reason for a suggestion, e.g. "13 serve receive attempts recorded. Median for 3 other Q4 liberos in these tryouts: 24." */
export function suggestionReason(player: Player, s: SecondLookSuggestion): string {
  const q = birthQuarter(player.birthDate);
  return `${s.playerAttempts} ${CONFIG.skills[s.skill].label.toLowerCase()} attempts recorded. Median for ${s.peers} other Q${q} ${player.position.toLowerCase()}s in these tryouts: ${s.median}.`;
}

// ---------- Court time ----------

/** Total attempts across all skills in one coach log. */
export function logAttempts(log: CoachLog): number {
  return Object.values(log.skills).reduce((n, s) => n + (s?.attempts ?? 0), 0);
}

/**
 * Attempts per 60 minutes for a log, only when individual on-court minutes were
 * recorded (> 0) and cover the same observations as the attempts. Whole-session
 * duration is never a substitute; returns null when unavailable.
 */
export function attemptsPer60(log: CoachLog): number | null {
  const minutes = log.minutes ?? 0;
  const attempts = logAttempts(log);
  if (minutes <= 0 || attempts === 0) return null;
  return (attempts / minutes) * 60;
}

// ---------- Schedule ----------

export interface ScheduleException {
  cancels: string[]; // dates whose recurring/scheduled session is cancelled
  adds: SessionEvent[]; // one-off added sessions
  marks: Record<string, { type: SessionType; title: string }>; // retype a date as game/tournament
}

export const EMPTY_EXCEPTIONS: ScheduleException = { cancels: [], adds: [], marks: {} };

export interface ScheduleEvent extends SessionEvent {
  source: "history" | "recurring" | "oneoff";
  cancelled: boolean;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Build the schedule for [start, end].
 * - Historical sessions from sessions.json are always preserved.
 * - Recurring practice weekdays generate outlines from effectiveDate forward.
 * - One-off adds, cancels and game/tournament marks take precedence.
 */
export function buildSchedule(
  start: string,
  end: string,
  recurringDays: number[],
  effectiveDate: string,
  ex: ScheduleException = EMPTY_EXCEPTIONS,
): ScheduleEvent[] {
  const out: ScheduleEvent[] = [];
  const seen = new Set<string>();

  for (const s of SESSIONS) {
    if (s.date < start || s.date > end) continue;
    seen.add(s.date);
    const mark = ex.marks[s.date];
    out.push({
      ...(mark ? { ...s, type: mark.type, title: mark.title } : s),
      source: "history",
      cancelled: ex.cancels.includes(s.date),
    });
  }

  const from = effectiveDate > start ? effectiveDate : start;
  const d = new Date(from + "T00:00:00Z");
  const last = new Date(end + "T00:00:00Z");
  while (d <= last) {
    const date = iso(d);
    if (!seen.has(date) && recurringDays.includes(d.getUTCDay())) {
      const mark = ex.marks[date];
      out.push({
        id: `rec-${date}`,
        date,
        time: "17:30",
        type: mark?.type ?? "practice",
        title: mark?.title ?? "Practice",
        source: "recurring",
        cancelled: ex.cancels.includes(date),
      });
      seen.add(date);
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }

  for (const a of ex.adds) {
    if (a.date < start || a.date > end) continue;
    out.push({ ...a, source: "oneoff", cancelled: ex.cancels.includes(a.date) });
  }

  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

/** Weekly session count implied by the chosen recurring weekdays. */
export function weeklySessionCount(recurringDays: number[]): number {
  return recurringDays.length;
}

// ---------- Calendar ----------

/** Weeks (Mon-first) of date strings covering the given month; null pads outside the month. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first offset
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(iso(new Date(Date.UTC(year, month, day))));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function formatDate(isoDate: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Date(isoDate + "T00:00:00Z").toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nextDayIso(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return iso(d);
}

// ---------- Follow-up plan ----------

export function validateReps(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed) || Number(trimmed) <= 0)
    return "Enter a whole number of repetitions greater than 0 (for example 15).";
  return null;
}

export function validateDrill(item: PlanDrill, plan: PlanDrill[]): string | null {
  if (plan.some((p) => p.playerId === item.playerId && p.skill === item.skill))
    return `${playerById(item.playerId).name} already has a ${CONFIG.skills[item.skill].label} drill. Edit it instead.`;
  return validateReps(String(item.reps));
}

export function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function planToCsv(plan: PlanDrill[]): string {
  const header = ["player_id", "player_name", "position", "skill", "target_reps", "note"];
  const lines = plan.map((item) => {
    const p = playerById(item.playerId);
    return [p.id, p.name, p.position, CONFIG.skills[item.skill].label, item.reps, item.note]
      .map(csvEscape)
      .join(",");
  });
  return [header.join(","), ...lines].join("\r\n");
}
