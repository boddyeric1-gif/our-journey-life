import { describe, it, expect } from "vitest";
import { computeCoupleProgress, isUnlocked, coupleLevelFromXp, COUPLE_UNLOCKS } from "./coupleLevel";

describe("coupleLevel", () => {
  it("level math matches xp curve", () => {
    expect(coupleLevelFromXp(0)).toBe(1);
    expect(coupleLevelFromXp(100)).toBe(2);
    expect(coupleLevelFromXp(400)).toBe(3);
    expect(coupleLevelFromXp(4900)).toBe(8);
    expect(coupleLevelFromXp(10_000)).toBe(11);
    expect(coupleLevelFromXp(19_600)).toBe(15);
  });

  it("dual gate: both required", () => {
    // High XP, zero days — still locked
    expect(isUnlocked(20, 0, "the_atlas")).toBe(false);
    // Many days, zero XP — still locked
    expect(isUnlocked(1, 100, "the_atlas")).toBe(false);
    // Both met — unlocked
    expect(isUnlocked(15, 30, "the_atlas")).toBe(true);
  });

  it("nextUnlock points to the first unmet milestone", () => {
    const p = computeCoupleProgress(0, 0);
    expect(p.nextUnlock?.key).toBe("quests_advanced");
    expect(p.unlocks.quests_advanced).toBe(false);

    // Paid Time Capsule should skip the time_capsule milestone hint.
    const paid = computeCoupleProgress(0, 0, { time_capsule: true });
    expect(paid.unlocks.time_capsule).toBe(true);
    expect(paid.nextUnlock?.key).toBe("quests_advanced");
  });

  it("nextUnlock null when everything earned or paid", () => {
    const p = computeCoupleProgress(50_000, 99);
    expect(p.unlocks.the_atlas).toBe(true);
    expect(p.nextUnlock).toBeNull();
  });

  it("thresholds match documented values", () => {
    expect(COUPLE_UNLOCKS.quests_advanced).toEqual({ level: 8, sharedDays: 14 });
    expect(COUPLE_UNLOCKS.time_capsule).toEqual({ level: 11, sharedDays: 21 });
    expect(COUPLE_UNLOCKS.the_atlas).toEqual({ level: 15, sharedDays: 30 });
  });
});
