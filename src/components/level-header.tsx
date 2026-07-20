import { levelFromXp } from "@/lib/xp";
import { RhythmRing, type RhythmDay } from "@/components/rhythm-ring";
import { Mail } from "lucide-react";

const GREETINGS = [
  (n: string) => <><span className="serif-italic text-rust">Hi,</span> {n}</>,
  (n: string) => <>{n}, <span className="serif-italic text-rust">quietly</span></>,
  (n: string) => <><span className="serif-italic text-rust">Welcome back,</span> {n}</>,
  (n: string) => <>{n} <span className="serif-italic text-rust">— again</span></>,
];

function pickGreeting(name: string) {
  // Stable per day: same greeting all day, different tomorrow.
  const day = Math.floor(Date.now() / 86_400_000);
  return GREETINGS[day % GREETINGS.length](name);
}

export function LevelHeader({
  displayName,
  totalXp,
  rhythm,
  paired,
  unreadLetters = 0,
  onOpenLetters,
}: {
  displayName: string;
  totalXp: number;
  // Streak/freezes/coupleStreak/bondLevel are still computed upstream but
  // intentionally not surfaced — the rhythm ring is the honest signal.
  streak: number;
  freezes: number;
  coupleStreak: number | null;
  bondLevel: number | null;
  rhythm: RhythmDay[] | null;
  paired: boolean;
  unreadLetters?: number;
  onOpenLetters?: () => void;
}) {
  const lvl = levelFromXp(totalXp);
  const pct = Math.round(lvl.percent * 100);
  return (
    <header className="px-5 pt-6 pb-2 animate-rise">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h1 className="min-w-0 truncate font-serif text-2xl text-ink leading-tight">
          {pickGreeting(displayName)}
        </h1>
        <div className="shrink-0 flex items-center gap-2">
          {onOpenLetters && (
            <button
              onClick={onOpenLetters}
              aria-label={unreadLetters > 0
                ? `Open letters — ${unreadLetters} unread`
                : "Open letters"}
              className="tap relative h-10 w-10 inline-flex items-center justify-center rounded-full border border-border bg-card/80 backdrop-blur-sm text-ink-soft hover:text-ink hover:bg-canvas-deep transition shadow-[0_1px_0_0_oklch(1_0_0_/_0.06)_inset,0_6px_18px_-8px_oklch(0_0_0/0.5)]"
            >
              <Mail className="h-[16px] w-[16px]" aria-hidden />
              {unreadLetters > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rust ring-2 ring-canvas shadow-[0_0_8px_oklch(0.71_0.075_32/0.7)]"
                  aria-hidden
                />
              )}
            </button>
          )}
          {/* Level chip — small ring showing progress. */}
          <div
            className="relative h-10 w-10 rounded-full grid place-items-center"
            style={{
              background: `conic-gradient(oklch(0.71 0.075 32 / 0.9) ${pct}%, oklch(1 0 0 / 0.08) ${pct}%)`,
            }}
            aria-label={`Level ${lvl.level}, ${pct}% to next`}
          >
            <div className="absolute inset-[2px] rounded-full bg-card grid place-items-center">
              <span className="font-serif text-[15px] text-ink leading-none">{lvl.level}</span>
            </div>
          </div>
        </div>
      </div>

      {rhythm && rhythm.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <RhythmRing days={rhythm} paired={paired} />
          <span className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">
            Last fortnight
          </span>
        </div>
      )}
    </header>
  );
}

