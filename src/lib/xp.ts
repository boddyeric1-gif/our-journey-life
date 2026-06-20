// XP and level math + date helpers used across server + client.

export const XP_FOR = {
  daily: 50,
  solo_reflection: 30,
  quest_step_solo: 80,
  quest_step_couple: 120,
  first_pair: 200,
  letter: 25,
  insight: 10,
} as const;

export function levelFromXp(totalXp: number) {
  const level = Math.floor(Math.sqrt(Math.max(0, totalXp) / 100)) + 1;
  const xpForLevel = (l: number) => (l - 1) * (l - 1) * 100;
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const intoLevel = totalXp - currentLevelXp;
  const span = nextLevelXp - currentLevelXp;
  return {
    level,
    intoLevel,
    span,
    percent: Math.max(0, Math.min(1, intoLevel / span)),
    nextLevelXp,
  };
}

// UTC YYYY-MM-DD (used for prompt rotation so both partners always see the
// same prompt, regardless of their tz).
export function todayUTC(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// Local YYYY-MM-DD for a given IANA timezone. Workers-safe via Intl.
export function localToday(timezone: string | null | undefined, d = new Date()): string {
  const tz = timezone && timezone.length > 0 ? timezone : "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const y = parts.find(p => p.type === "year")?.value ?? "1970";
    const m = parts.find(p => p.type === "month")?.value ?? "01";
    const day = parts.find(p => p.type === "day")?.value ?? "01";
    return `${y}-${m}-${day}`;
  } catch {
    return todayUTC(d);
  }
}

// Pure date arithmetic on YYYY-MM-DD strings.
export function daysBetween(aISO: string, bISO: string): number {
  const a = Date.UTC(
    Number(aISO.slice(0, 4)),
    Number(aISO.slice(5, 7)) - 1,
    Number(aISO.slice(8, 10)),
  );
  const b = Date.UTC(
    Number(bISO.slice(0, 4)),
    Number(bISO.slice(5, 7)) - 1,
    Number(bISO.slice(8, 10)),
  );
  return Math.floor((b - a) / 86_400_000);
}

export function daysSinceUTC(startISO: string, today = todayUTC()): number {
  return Math.max(0, daysBetween(startISO, today));
}

// Deterministic prompt rotation by couple birth + day index. PROMPT_POOL=60.
export function promptPositionFor(coupleCreatedAt: string, today = todayUTC()): number {
  const start = coupleCreatedAt.slice(0, 10);
  const idx = daysSinceUTC(start, today);
  return (idx % 60) + 1;
}

// 6-char invite code, exclude lookalikes. Uses CSPRNG for unpredictability.
export function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < bytes.length; i++) code += alphabet[bytes[i]! % alphabet.length];
  return code;
}

// --- Streak transition (pure) -------------------------------------------------
// Single source of truth for "advance a user's streak" called from any server fn.
// Returns the next streak value, whether a freeze was spent, and which branch
// fired (useful for telemetry + tests). Same-day is a no-op; +1 day extends;
// +2 days spends one freeze if available, otherwise resets; anything else
// resets to 1.

export type StreakKind = "start" | "same-day" | "extend" | "freeze" | "reset";

export interface AdvanceStreakInput {
  today: string;            // YYYY-MM-DD in the user's local tz
  lastActive: string | null;
  current: number;
  freezes: number;
}

export interface AdvanceStreakResult {
  next: number;
  freezesUsed: 0 | 1;
  kind: StreakKind;
}

export function advanceStreak(input: AdvanceStreakInput): AdvanceStreakResult {
  const { today, lastActive, current, freezes } = input;
  if (!lastActive) return { next: 1, freezesUsed: 0, kind: "start" };
  const diff = daysBetween(lastActive, today);
  if (diff === 0) return { next: current, freezesUsed: 0, kind: "same-day" };
  if (diff === 1) return { next: current + 1, freezesUsed: 0, kind: "extend" };
  if (diff === 2 && freezes > 0) return { next: current + 1, freezesUsed: 1, kind: "freeze" };
  return { next: 1, freezesUsed: 0, kind: "reset" };
}

