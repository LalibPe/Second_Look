import { describe, expect, it } from "vitest";
import { PLAYERS } from "@/lib/demo-data";
import {
  DEFAULT_THRESHOLDS, SUMMARIES, csvEscape, passCompletion, planToCsv, quarterAudit,
  reviewStatus, validateAdd, validateMinutes,
} from "@/lib/analytics";

const p14 = SUMMARIES.find((s) => s.player.id === "P14")!;

describe("demo data rules", () => {
  it("has 16 trialists with 7 provisionally selected", () => {
    expect(PLAYERS).toHaveLength(16);
    expect(PLAYERS.filter((p) => p.provisional)).toHaveLength(7);
  });
  it("quarter audit is 3/4, 2/4, 1/4, 1/4", () => {
    expect(quarterAudit().map((q) => `${q.selected}/${q.attended}`)).toEqual(["3/4", "2/4", "1/4", "1/4"]);
  });
  it("P14 has 12 minutes over 2 days with latest ratings 8,7,8", () => {
    expect(p14.quarter).toBe(4);
    expect(p14.totalMinutes).toBe(12);
    expect(p14.observationDays).toBe(2);
    expect(p14.latest).toEqual({ passing: 8, firstTouch: 7, decisions: 8 });
    expect(p14.mean!.toFixed(1)).toBe("7.7");
  });
  it("P14 is suggested for review by default with the stated reason", () => {
    const r = reviewStatus(p14, DEFAULT_THRESHOLDS);
    expect(r.suggested).toBe(true);
    expect(r.reason).toBe("7.7/10 technical assessment · 12 minutes observed");
  });
  it("P14 is not suggested once minutes threshold is 12 (below, not at)", () => {
    expect(reviewStatus(p14, { rating: 7, minutes: 12 }).suggested).toBe(false);
  });
  it("P14 combined pass completion is 9/13", () => {
    const pc = passCompletion(p14.observations);
    expect([pc.completed, pc.attempted]).toEqual([9, 13]);
    expect(pc.pct!.toFixed(1)).toBe("69.2");
  });
  it("completed passes never exceed attempted", () => {
    for (const s of SUMMARIES) for (const o of s.observations)
      if (o.passesAttempted !== null) expect(o.passesCompleted!).toBeLessThanOrEqual(o.passesAttempted);
  });
});

describe("plan rules", () => {
  const plan = [{ playerId: "P14", minutes: 15, focus: "Decisions under pressure" }];
  it("rejects duplicates", () => {
    expect(validateAdd({ playerId: "P14", minutes: 5, focus: "" }, plan, 30)).not.toBeNull();
  });
  it("rejects non-whole and zero minutes", () => {
    expect(validateMinutes("2.5", [], 30, "P01")).not.toBeNull();
    expect(validateMinutes("0", [], 30, "P01")).not.toBeNull();
  });
  it("rejects allocation beyond the budget", () => {
    expect(validateMinutes("16", plan, 30, "P01")).not.toBeNull();
    expect(validateMinutes("15", plan, 30, "P01")).toBeNull();
  });
  it("exports CSV with escaping", () => {
    expect(csvEscape('a, "b"\nc')).toBe('"a, ""b""\nc"');
    expect(planToCsv(plan)).toBe(
      "player_id,player_name,position,planned_minutes,focus\r\nP14,Felix Andersen,Central midfielder,15,Decisions under pressure",
    );
  });
});
