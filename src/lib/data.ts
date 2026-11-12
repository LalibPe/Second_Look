import playersJson from "@/data/players.json";
import sessionsJson from "@/data/sessions.json";
import observationsJson from "@/data/observations.json";
import drillsJson from "@/data/scheduled_drills.json";
import configJson from "@/data/app_config.json";

export type SkillKey = "serveReceive" | "attack" | "block" | "serve";
export type SessionType = "practice" | "game" | "tournament";
export type Quarter = 1 | 2 | 3 | 4;

export interface Player {
  id: string;
  name: string;
  position: string;
  birthDate: string; // YYYY-MM-DD
  provisional: boolean;
}

export interface SessionEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  type: SessionType;
  title: string;
}

export interface SkillStat {
  attempts: number;
  successes: number;
}

/** Historical measured observation from observations.json. */
export interface ObservationEntry {
  id: string;
  playerId: string;
  sessionId: string;
  date: string;
  skills: Partial<Record<SkillKey, SkillStat>>;
  note: string;
}

/** Coach-logged entry from a follow-up session (saved locally). */
export interface CoachLog {
  playerId: string;
  date: string;
  sessionType: SessionType;
  assessment: number | null; // 1–5
  comment: string;
  skills: Partial<Record<SkillKey, SkillStat>>;
  /** Actual on-court minutes (optional, scrimmages/matches only). Never derived from session duration. */
  minutes?: number | null;
}

export interface PlanDrill {
  playerId: string;
  skill: SkillKey;
  reps: number;
  note: string;
}

export interface AppConfig {
  sport: string;
  syntheticDataNotice: string;
  selectionYearCutoff: string;
  positions: string[];
  skills: Record<SkillKey, { label: string; unit: string }>;
  sessionTypes: Record<SessionType, string>;
  assessmentScale: Record<string, string>;
  defaultPracticeDays: number[]; // 0 = Sunday … 6 = Saturday
  demoCalendarStart: string; // YYYY-MM
  secondLookThresholdPct: number; // editable demo threshold for the second-look rule
  roleSkills: Record<string, SkillKey[]>; // role-relevant skills per position
}

export const CONFIG = configJson as AppConfig;
export const PLAYERS: Player[] = playersJson.players;
export const SESSIONS: SessionEvent[] = sessionsJson.sessions as SessionEvent[];
export const OBSERVATIONS: ObservationEntry[] = observationsJson.observations as ObservationEntry[];
export const SEED_DRILLS: PlanDrill[] = drillsJson.drills as PlanDrill[];
export const SKILL_KEYS = Object.keys(CONFIG.skills) as SkillKey[];
