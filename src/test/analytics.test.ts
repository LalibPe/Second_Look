import { describe, expect, it } from "vitest";
import { PLAYERS, SEED_DRILLS, type CoachLog } from "@/lib/data";
import {
  assessmentSeries, attemptsPer60, birthQuarter, buildSchedule, csvEscape, EMPTY_EXCEPTIONS, median, monthGrid,
  peerComparison, planToCsv, quarterAudit, secondLookSuggestion, skillSeries, skillTotals, suggestionReason,
  validateDrill, validateReps,
} from "@/lib/analytics";

describe("roster and audit", () => {
  it("has 19 trialists with 9 tentatively selected", () => {
    expect(PLAYERS).toHaveLength(19);
    expect(PLAYERS.filter((p) => p.provisional)).toHaveLength(9);
  });
  it("quarter audit is Q1 6/6, Q2 3/3, Q3 0/3, Q4 0/7", () => {
    expect(quarterAudit().map((q) => `${q.selected}/${q.attended}`)).toEqual(["6/6", "3/3", "0/3", "0/7"]);
  });
  it("Ana Begić is p01, an unselected Q4 libero", () => {
    const ana = PLAYERS.find((p) => p.id === "p01")!;
    expect(ana.name).toBe("Ana Begić");
    expect(ana.position).toBe("Libero");
    expect(ana.provisional).toBe(false);
    expect(birthQuarter(ana.birthDate)).toBe(4);
  });
  it("adds three fictional Q4 libero peers, all outside the tentative squad", () => {
    const peers = PLAYERS.filter((p) => ["p17", "p18", "p19"].includes(p.id));
    expect(peers).toHaveLength(3);
    for (const p of peers) {
      expect(p.position).toBe("Libero");
      expect(birthQuarter(p.birthDate)).toBe(4);
      expect(p.provisional).toBe(false);
    }
  });
});

describe("skill rates", () => {
  it("Ana's serve receive combines 6/8 and 3/5 into 9/13 (69.2%)", () => {
    const t = skillTotals("p01", "serveReceive");
    expect([t.successes, t.attempts]).toEqual([9, 13]);
    expect(t.pct!.toFixed(1)).toBe("69.2");
  });
  it("per-date series sums attempts before computing the rate", () => {
    const series = skillSeries("p01", "serveReceive");
    expect(series.map((p) => [p.date, p.successes, p.attempts])).toEqual([
      ["2026-10-14", 6, 8],
      ["2026-10-28", 3, 5],
    ]);
  });
  it("coach logs merge into totals without replacing history", () => {
    const t = skillTotals("p01", "serveReceive", [
      { playerId: "p01", date: "2026-11-13", sessionType: "practice", assessment: 4, comment: "", skills: { serveReceive: { attempts: 7, successes: 5 } } },
    ]);
    expect([t.successes, t.attempts]).toEqual([14, 20]);
  });
  it("assessment series keeps saved scores even without skill attempts", () => {
    const s = assessmentSeries("p01", [
      { playerId: "p01", date: "2026-11-13", sessionType: "practice", assessment: 4, comment: "Good session", skills: {} },
    ]);
    expect(s).toHaveLength(1);
    expect(s[0]!.value).toBe(4);
  });
  it("successes never exceed attempts in the demo data", () => {
    for (const p of PLAYERS) {
      for (const k of ["serveReceive", "attack", "block", "serve"] as const) {
        const t = skillTotals(p.id, k);
        expect(t.successes).toBeLessThanOrEqual(t.attempts);
      }
    }
  });
});

describe("second-look rule", () => {
  it("median of 20, 24, 28 is 24", () => {
    expect(median([28, 20, 24])).toBe(24);
  });
  it("the three Q4 libero peers recorded 20, 24 and 28 serve-receive attempts", () => {
    const totals = ["p17", "p18", "p19"].map((id) => skillTotals(id, "serveReceive").attempts);
    expect(totals).toEqual([20, 24, 28]);
  });
  it("Ana's peer comparison: 13 attempts vs median 24 from 3 peers", () => {
    const r = peerComparison("p01", "serveReceive");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.comparison.playerAttempts).toBe(13);
    expect(r.comparison.median).toBe(24);
    expect(r.comparison.peers).toBe(3);
    expect([...r.comparison.peerAttempts].sort((a, b) => a - b)).toEqual([20, 24, 28]);
  });
  it("suggests Ana at the default 75% threshold (13 < 18)", () => {
    const ana = PLAYERS.find((p) => p.id === "p01")!;
    const s = secondLookSuggestion(ana, 75);
    expect(s).not.toBeNull();
    expect(s!.skill).toBe("serveReceive");
    expect(s!.cutoff).toBe(18);
    expect(suggestionReason(ana, s!)).toBe(
      "13 serve receive attempts recorded. Median for 3 other Q4 liberos in these tryouts: 24.",
    );
  });
  it("the threshold is editable: at 50% Ana is no longer suggested", () => {
    const ana = PLAYERS.find((p) => p.id === "p01")!;
    expect(secondLookSuggestion(ana, 50)).toBeNull();
  });
  it("never suggests tentatively selected players", () => {
    for (const p of PLAYERS.filter((x) => x.provisional)) {
      expect(secondLookSuggestion(p, 75)).toBeNull();
    }
  });
  it("leaves the suggestion unset when there are too few comparable peers", () => {
    const r = peerComparison("p11", "attack"); // Tereza is the only Q3 opposite with attack attempts
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/comparable peer/);
  });
  it("a follow-up coach log never changes the tryout comparison", () => {
    const before = peerComparison("p01", "serveReceive");
    // peerComparison reads only the historical observations, so logs cannot enter it.
    const after = peerComparison("p01", "serveReceive");
    expect(after).toEqual(before);
  });
});

describe("court time", () => {
  const log: CoachLog = {
    playerId: "p01", date: "2026-11-07", sessionType: "game", assessment: null, comment: "",
    skills: { serveReceive: { attempts: 12, successes: 9 } }, minutes: 24,
  };
  it("computes attempts per 60 from individual minutes", () => {
    expect(attemptsPer60(log)).toBe(30);
  });
  it("leaves the rate unavailable when minutes are missing or zero", () => {
    expect(attemptsPer60({ ...log, minutes: null })).toBeNull();
    expect(attemptsPer60({ ...log, minutes: 0 })).toBeNull();
    expect(attemptsPer60({ ...log, skills: {} })).toBeNull();
  });
});

describe("schedule", () => {
  it("preserves historical sessions and adds recurring outlines from the effective date", () => {
    const s = buildSchedule("2026-10-01", "2026-11-30", [1, 4], "2026-11-13");
    expect(s.some((e) => e.date === "2026-10-05" && e.source === "history")).toBe(true);
    expect(s.some((e) => e.date === "2026-11-16" && e.source === "recurring")).toBe(true); // Monday
    expect(s.some((e) => e.date === "2026-11-17")).toBe(false); // Tuesday, not in pattern
  });
  it("changing Mon/Thu to Tue/Fri moves future outlines only", () => {
    const s = buildSchedule("2026-10-01", "2026-11-30", [2, 5], "2026-11-13");
    expect(s.some((e) => e.date === "2026-11-17" && e.source === "recurring")).toBe(true); // Tuesday
    expect(s.some((e) => e.date === "2026-11-20" && e.source === "recurring")).toBe(true); // Friday
    expect(s.some((e) => e.date === "2026-11-16")).toBe(false); // Monday no longer generated
    expect(s.some((e) => e.date === "2026-11-11" && e.source === "history")).toBe(true); // history kept
  });
  it("one-off cancels, marks and adds take precedence", () => {
    const s = buildSchedule("2026-11-13", "2026-11-30", [1, 4], "2026-11-13", {
      cancels: ["2026-11-16"],
      marks: { "2026-11-19": { type: "game", title: "Friendly vs OK Igman" } },
      adds: [{ id: "x", date: "2026-11-21", time: "10:00", type: "tournament", title: "Winter cup" }],
    });
    expect(s.find((e) => e.date === "2026-11-16")!.cancelled).toBe(true);
    expect(s.find((e) => e.date === "2026-11-19")!.type).toBe("game");
    expect(s.some((e) => e.date === "2026-11-21" && e.type === "tournament")).toBe(true);
  });
});

describe("calendar", () => {
  it("November 2026 grid starts on Monday the 2nd week cell layout", () => {
    const weeks = monthGrid(2026, 10);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });
});

describe("follow-up plan", () => {
  it("seeds Ana's 15-rep serve-receive drill", () => {
    const ana = SEED_DRILLS.find((d) => d.playerId === "p01")!;
    expect(ana.skill).toBe("serveReceive");
    expect(ana.reps).toBe(15);
  });
  it("rejects duplicate player+skill drills and bad reps", () => {
    expect(validateDrill({ playerId: "p01", skill: "serveReceive", reps: 10, note: "" }, SEED_DRILLS)).not.toBeNull();
    expect(validateReps("2.5")).not.toBeNull();
    expect(validateReps("0")).not.toBeNull();
    expect(validateReps("15")).toBeNull();
  });
  it("exports CSV with escaping and one row per drill", () => {
    expect(csvEscape('a, "b"\nc')).toBe('"a, ""b""\nc"');
    const csv = planToCsv([{ playerId: "p01", skill: "serveReceive", reps: 20, note: "Edited note" }]);
    expect(csv).toBe(
      "player_id,player_name,position,skill,target_reps,note\r\np01,Ana Begić,Libero,Serve receive,20,Edited note",
    );
  });
});

import { ATTENDANCE as ATT, OBSERVATIONS as OBS, PLAYERS as PL } from "@/lib/data";
describe("attendance", () => {
  it("every player attended at least 10 sessions, including all observation dates", () => {
    for (const p of PL) {
      expect((ATT[p.id] ?? []).length).toBeGreaterThanOrEqual(10);
      for (const o of OBS.filter((x) => x.playerId === p.id)) expect(ATT[p.id]).toContain(o.date);
    }
  });
});
