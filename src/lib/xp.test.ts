import { describe, it, expect } from "vitest";
import { localToday, daysBetween, advanceStreak } from "./xp";

describe("localToday", () => {
  it("returns YYYY-MM-DD in the given timezone", () => {
    const today = localToday("UTC");
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("falls back to UTC for a bad timezone", () => {
    const a = localToday("Not/A_Real_Zone");
    const b = localToday("UTC");
    expect(a).toBe(b);
  });

  it("differs between Pacific and Tokyo at a known instant", () => {
    // 2026-06-15 06:00Z is the 14th in LA but the 15th in Tokyo
    const at = new Date("2026-06-15T06:00:00Z");
    expect(localToday("America/Los_Angeles", at)).toBe("2026-06-14");
    expect(localToday("Asia/Tokyo", at)).toBe("2026-06-15");
  });
});

describe("daysBetween", () => {
  it("is 1 for consecutive calendar days", () => {
    expect(daysBetween("2026-06-15", "2026-06-16")).toBe(1);
  });

  it("does not drift across DST in America/Los_Angeles", () => {
    // March 9 2025 is the US DST start; arithmetic should still be 1 day.
    expect(daysBetween("2025-03-08", "2025-03-09")).toBe(1);
    expect(daysBetween("2025-03-09", "2025-03-10")).toBe(1);
  });

  it("handles month + year boundaries", () => {
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
  });
});

describe("advanceStreak", () => {
  it("starts a streak at 1 when there is no prior day", () => {
    const r = advanceStreak({ today: "2026-06-15", lastActive: null, current: 0, freezes: 2 });
    expect(r).toEqual({ next: 1, freezesUsed: 0, kind: "start" });
  });

  it("is a no-op on the same day", () => {
    const r = advanceStreak({ today: "2026-06-15", lastActive: "2026-06-15", current: 4, freezes: 2 });
    expect(r).toEqual({ next: 4, freezesUsed: 0, kind: "same-day" });
  });

  it("increments by 1 on the next day", () => {
    const r = advanceStreak({ today: "2026-06-16", lastActive: "2026-06-15", current: 4, freezes: 2 });
    expect(r).toEqual({ next: 5, freezesUsed: 0, kind: "extend" });
  });

  it("spends a freeze across a one-day gap", () => {
    const r = advanceStreak({ today: "2026-06-17", lastActive: "2026-06-15", current: 4, freezes: 2 });
    expect(r).toEqual({ next: 5, freezesUsed: 1, kind: "freeze" });
  });

  it("resets when no freeze is available and a gap appears", () => {
    const r = advanceStreak({ today: "2026-06-17", lastActive: "2026-06-15", current: 4, freezes: 0 });
    expect(r).toEqual({ next: 1, freezesUsed: 0, kind: "reset" });
  });

  it("resets after a multi-day gap regardless of freezes", () => {
    const r = advanceStreak({ today: "2026-06-20", lastActive: "2026-06-15", current: 4, freezes: 2 });
    expect(r).toEqual({ next: 1, freezesUsed: 0, kind: "reset" });
  });
});
