// Fixed synthetic demo dataset. All names are fictional. Do not generate at runtime.
export type PositionGroup = "GK" | "DEF" | "MID" | "FWD";
export type SessionType = "Training" | "Small-sided game" | "Trial match";

export interface Player {
  id: string;
  name: string;
  position: string;
  group: PositionGroup;
  birthDate: string; // YYYY-MM-DD
  provisional: boolean;
}

export interface Observation {
  id: string;
  playerId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  sessionType: SessionType;
  minutes: number;
  passing: number | null;
  firstTouch: number | null;
  decisions: number | null;
  passesAttempted: number | null;
  passesCompleted: number | null;
  goals: number | null;
  note: string;
}

export const DEMO_FINAL_DATE = "2026-10-31";

export const PLAYERS: Player[] = [
  { id: "P01", name: "Mateo Varga", position: "Central midfielder", group: "MID", birthDate: "2013-01-14", provisional: true },
  { id: "P02", name: "Kian Okafor", position: "Striker", group: "FWD", birthDate: "2013-02-03", provisional: true },
  { id: "P03", name: "Luca Brandt", position: "Centre-back", group: "DEF", birthDate: "2013-03-22", provisional: true },
  { id: "P04", name: "Noah Petrić", position: "Goalkeeper", group: "GK", birthDate: "2013-02-27", provisional: false },
  { id: "P05", name: "Amir Haddad", position: "Attacking midfielder", group: "MID", birthDate: "2013-04-09", provisional: true },
  { id: "P06", name: "Elias Moreau", position: "Full-back", group: "DEF", birthDate: "2013-05-30", provisional: true },
  { id: "P07", name: "Tomás Reyes", position: "Winger", group: "FWD", birthDate: "2013-06-11", provisional: false },
  { id: "P08", name: "Jonah Lindqvist", position: "Defensive midfielder", group: "MID", birthDate: "2013-04-25", provisional: false },
  { id: "P09", name: "Sami Kovač", position: "Centre-back", group: "DEF", birthDate: "2013-07-19", provisional: true },
  { id: "P10", name: "Oskar Nowak", position: "Central midfielder", group: "MID", birthDate: "2013-08-02", provisional: false },
  { id: "P11", name: "Rafael Dias", position: "Striker", group: "FWD", birthDate: "2013-09-14", provisional: false },
  { id: "P12", name: "Ilan Weiss", position: "Goalkeeper", group: "GK", birthDate: "2013-07-28", provisional: false },
  { id: "P13", name: "Dario Fonseca", position: "Winger", group: "FWD", birthDate: "2013-10-06", provisional: true },
  { id: "P14", name: "Felix Andersen", position: "Central midfielder", group: "MID", birthDate: "2013-11-18", provisional: false },
  { id: "P15", name: "Yusuf Demir", position: "Full-back", group: "DEF", birthDate: "2013-12-04", provisional: false },
  { id: "P16", name: "Leo Marchetti", position: "Defensive midfielder", group: "MID", birthDate: "2013-10-29", provisional: false },
];

type Row = [string, string, string, SessionType, number, number | null, number | null, number | null, number | null, number | null, number | null, string];
const T: SessionType = "Training";
const S: SessionType = "Small-sided game";
const M: SessionType = "Trial match";

// [player, date(MM-DD), time, type, minutes, passing, firstTouch, decisions, attempted, completed, goals, note]
const ROWS: Row[] = [
  ["P01", "10-05", "17:30", T, 25, 7, 7, 6, 18, 15, 0, "Composed on the ball, scanned before receiving."],
  ["P01", "10-10", "10:00", M, 30, 7, 8, 7, 24, 20, 1, "Late run into the box for the goal."],
  ["P01", "10-10", "15:00", S, 15, 8, 7, 7, 12, 11, 0, "Quick one-touch combinations in tight space."],
  ["P01", "10-19", "17:30", T, 20, 8, 8, 7, 16, 14, 0, "Switched play well under pressure."],
  ["P01", "10-28", "17:30", T, 20, 8, 8, 8, 15, 13, 0, "Dictated tempo; strong body shape."],
  ["P02", "10-06", "17:30", T, 25, 6, 7, 6, 8, 5, 2, "Sharp finishing, link-up still raw."],
  ["P02", "10-10", "10:00", M, 30, 6, 7, 7, 10, 6, 1, "Held the ball up well against bigger CBs."],
  ["P02", "10-20", "17:30", T, 20, 7, 7, 7, 9, 7, 1, "Better movement off the shoulder."],
  ["P02", "10-31", "10:00", M, 30, 7, 8, 7, 11, 8, 2, "Two well-taken finishes, pressed from the front."],
  ["P03", "10-05", "17:30", T, 25, 7, 6, 7, 20, 18, 0, "Reliable distribution, good aerial timing."],
  ["P03", "10-17", "10:00", M, 30, 7, 6, 7, 22, 19, 0, "Organised the back line confidently."],
  ["P03", "10-31", "10:00", M, 30, 7, 7, 7, 25, 22, 0, "Steady; stepped in to intercept twice."],
  ["P04", "10-08", "17:30", T, 30, 6, 6, 6, 10, 7, 0, "Good shot-stopping, distribution under pressure inconsistent."],
  ["P04", "10-17", "10:00", M, 30, 5, 6, 6, 12, 8, 0, "Hesitant coming for crosses."],
  ["P04", "10-29", "17:30", T, 25, 6, 6, 6, 9, 6, 0, "Kicking range improving."],
  ["P05", "10-07", "17:30", T, 20, 8, 7, 6, 14, 11, 1, "Creative, sometimes forces the final pass."],
  ["P05", "10-17", "10:00", M, 30, 6, 7, 5, 18, 12, 0, "Lost possession often in the final third."],
  ["P05", "10-24", "10:00", M, 30, 8, 8, 7, 17, 14, 1, "Excellent; assisted and scored."],
  ["P05", "10-30", "17:30", T, 20, 7, 7, 6, 12, 9, 0, "Mixed session, bright in spells."],
  ["P06", "10-06", "17:30", T, 25, 6, 6, 7, 15, 12, 0, "Disciplined positioning, overlaps when safe."],
  ["P06", "10-17", "10:00", M, 30, 7, 6, 7, 18, 15, 0, "Recovered well in transition."],
  ["P06", "10-27", "17:30", T, 20, 7, 7, 7, 14, 12, 0, "Crossing quality improving."],
  ["P07", "10-09", "10:00", M, 9, 7, 8, 7, 4, 3, 1, "Came on late, beat his man twice and scored."],
  ["P07", "10-23", "15:00", S, 6, 8, 7, 7, 3, 2, 0, "Lively in a short spell; good first touch wide."],
  ["P08", "10-05", "17:30", T, 20, 6, 6, 6, 14, 10, 0, "Works hard, passing range limited."],
  ["P08", "10-12", "15:00", S, 15, 6, 5, 6, 10, 7, 0, "Heavy touches in tight areas."],
  ["P08", "10-24", "10:00", M, 30, 6, 6, 7, 20, 15, 0, "Read the game well defensively."],
  ["P09", "10-07", "17:30", T, 25, 6, 6, 6, 16, 12, 0, "Strong in duels, rushed on the ball."],
  ["P09", "10-17", "10:00", M, 30, 7, 6, 7, 19, 15, 0, "Calmer in possession than last week."],
  ["P09", "10-24", "10:00", M, 30, 7, 7, 7, 21, 18, 1, "Headed goal from a corner; solid."],
  ["P10", "10-06", "17:30", T, 20, 7, 7, 8, 15, 13, 0, "Clever positioning between lines."],
  ["P10", "10-17", "10:00", M, 30, 6, 7, 7, 20, 14, 0, "Quieter game, drifted out of it."],
  ["P10", "10-27", "17:30", T, 25, 8, 7, 7, 18, 16, 0, "Precise passing, good tempo."],
  ["P11", "10-07", "17:30", T, 10, 6, 7, 7, 5, 3, 0, "Bright movement, finishing rushed."],
  ["P11", "10-21", "15:00", S, 8, 7, 7, 8, 6, 5, 1, "Smart decision to cut back, then scored."],
  ["P12", "10-16", "17:30", T, 10, 6, 7, null, 6, 5, 0, "Handling clean; decisions not assessed this session."],
  ["P13", "10-05", "17:30", T, 25, 6, 7, 6, 9, 6, 1, "Direct dribbler, final ball inconsistent."],
  ["P13", "10-17", "10:00", M, 30, 6, 6, 6, 11, 7, 0, "Isolated on the wing; few touches."],
  ["P13", "10-26", "15:00", S, 15, 7, 7, 7, 8, 6, 1, "Combined well with the striker."],
  ["P14", "10-14", "17:30", T, 8, 7, 6, 7, 8, 6, 0, "Brief cameo; tidy passing and scanned early."],
  ["P14", "10-28", "15:00", S, 4, 8, 7, 8, 5, 3, 0, "Only four minutes, but broke the press twice with good choices."],
  ["P15", "10-08", "17:30", T, 8, 6, 6, 7, 6, 4, 0, "Good recovery pace, passing safe."],
  ["P15", "10-22", "15:00", S, 6, 6, 7, 6, 4, 3, null, "Short spell; goals not recorded in this drill."],
  ["P16", "10-12", "15:00", S, 5, 8, 6, 7, 4, 4, 0, "Strong start, good range."],
  ["P16", "10-25", "17:30", T, 4, 5, 6, 6, 3, 1, 0, "Struggled with pace of the drill."],
  ["P16", "10-30", "17:30", T, 6, 7, 6, 7, 5, 4, 0, "Bounced back, tidier."],
];

export const OBSERVATIONS: Observation[] = (() => {
  const counts: Record<string, number> = {};
  return ROWS.map(([pid, md, time, type, min, pa, ft, dm, att, comp, goals, note]) => {
    counts[pid] = (counts[pid] ?? 0) + 1;
    return {
      id: `${pid}-O${counts[pid]}`,
      playerId: pid,
      date: `2026-${md}`,
      time,
      sessionType: type,
      minutes: min,
      passing: pa,
      firstTouch: ft,
      decisions: dm,
      passesAttempted: att,
      passesCompleted: comp,
      goals,
      note,
    };
  });
})();
