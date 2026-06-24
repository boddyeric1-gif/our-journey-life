// Couple-level unlocks. Shared with server functions and client UI so the
// thresholds, level math, and "is unlocked" logic can't drift apart.
//
// Dual gate by design — every milestone requires BOTH:
//   1) couple level ≥ N  (XP-based, can spike from quests)
//   2) shared days ≥ M   (calendar-bound, one per real day with both partners
//                         active; cannot be grinded)
//
// Paid entitlements are an alternative path; they bypass both gates.

export const COUPLE_UNLOCKS = {
  quests_advanced: { level: 8,  sharedDays: 14 },
  time_capsule:    { level: 11, sharedDays: 21 },
  the_atlas:       { level: 15, sharedDays: 30 },
} as const;

export type UnlockKey = keyof typeof COUPLE_UNLOCKS;

export function coupleLevelFromXp(totalXp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, totalXp) / 100)) + 1;
}

export function isUnlocked(
  level: number,
  sharedDays: number,
  key: UnlockKey,
): boolean {
  const t = COUPLE_UNLOCKS[key];
  return level >= t.level && sharedDays >= t.sharedDays;
}

export type CoupleProgress = {
  totalXp: number;
  level: number;
  sharedDays: number;
  unlocks: Record<UnlockKey, boolean>;
  /** Next unlock to chase, null if all earned (or all paid). */
  nextUnlock:
    | {
        key: UnlockKey;
        label: string;
        levelTarget: number;
        levelRemaining: number;
        daysTarget: number;
        daysRemaining: number;
      }
    | null;
};

const LABELS: Record<UnlockKey, string> = {
  quests_advanced: "Advanced chapters",
  time_capsule: "Time Capsule",
  the_atlas: "The Atlas",
};

/**
 * Build a couple-progress payload. `paid` lets the caller suppress
 * "next unlock" hints for features the couple already paid for.
 */
export function computeCoupleProgress(
  totalXp: number,
  sharedDays: number,
  paid: { time_capsule?: boolean; the_atlas?: boolean } = {},
): CoupleProgress {
  const level = coupleLevelFromXp(totalXp);
  const order: UnlockKey[] = ["quests_advanced", "time_capsule", "the_atlas"];
  const unlocks = {
    quests_advanced: isUnlocked(level, sharedDays, "quests_advanced"),
    time_capsule: !!paid.time_capsule || isUnlocked(level, sharedDays, "time_capsule"),
    the_atlas: !!paid.the_atlas || isUnlocked(level, sharedDays, "the_atlas"),
  };

  let nextUnlock: CoupleProgress["nextUnlock"] = null;
  for (const key of order) {
    if (unlocks[key]) continue;
    // Skip features the couple paid for — they don't need to chase them.
    if (key === "time_capsule" && paid.time_capsule) continue;
    if (key === "the_atlas" && paid.the_atlas) continue;
    const t = COUPLE_UNLOCKS[key];
    nextUnlock = {
      key,
      label: LABELS[key],
      levelTarget: t.level,
      levelRemaining: Math.max(0, t.level - level),
      daysTarget: t.sharedDays,
      daysRemaining: Math.max(0, t.sharedDays - sharedDays),
    };
    break;
  }

  return { totalXp, level, sharedDays, unlocks, nextUnlock };
}
