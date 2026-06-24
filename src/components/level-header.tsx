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
  return (
    <header className="px-5 pt-6 pb-2">
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
              className="relative h-9 w-9 inline-flex items-center justify-center rounded-full border border-border bg-card text-ink-soft hover:text-ink hover:bg-canvas-deep transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rust/60"
            >
              <Mail className="h-4 w-4" aria-hidden />
              {unreadLetters > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rust ring-2 ring-canvas"
                  aria-hidden
                />
              )}
            </button>
          )}
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.14em] text-ink-mute">Level</p>
            <p className="font-serif text-xl text-ink leading-none">{lvl.level}</p>
            <p className="text-[10px] text-ink-mute mt-0.5">{Math.round(lvl.percent * 100)}%</p>
          </div>
        </div>
      </div>

      {rhythm && rhythm.length > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <RhythmRing days={rhythm} paired={paired} />
          <span className="text-[11px] uppercase tracking-[0.14em] text-ink-mute">
            Last fortnight
          </span>
        </div>
      )}
    </header>
  );
}
