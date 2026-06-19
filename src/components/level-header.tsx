import { levelFromXp } from "@/lib/xp";

export function LevelHeader({
  displayName, totalXp, streak, freezes, coupleStreak, bondLevel,
}: {
  displayName: string;
  totalXp: number;
  streak: number;
  freezes: number;
  coupleStreak: number | null;
  bondLevel: number | null;
}) {
  const lvl = levelFromXp(totalXp);
  return (
    <header className="px-5 pt-6 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Volume One</p>
          <h1 className="mt-1 font-serif text-2xl text-ink leading-tight">
            <span className="serif-italic text-rust">Hi,</span> {displayName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StatBadge label="Streak" value={`${streak}`} sub={freezes > 0 ? `${freezes} freeze${freezes>1?"s":""}` : "days"} />
          <StatBadge label="Level" value={`${lvl.level}`} sub={`${Math.round(lvl.percent * 100)}%`} />
        </div>
      </div>

      {/* XP progress bar */}
      <div className="mt-4">
        <div className="h-1.5 w-full bg-canvas-deep rounded-full overflow-hidden">
          <div className="h-full bg-rust transition-all" style={{ width: `${Math.max(4, lvl.percent * 100)}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-ink-mute">
          <span>{totalXp} XP</span>
          <span>{lvl.nextLevelXp} XP · Level {lvl.level + 1}</span>
        </div>
      </div>

      {coupleStreak !== null && bondLevel !== null && (
        <div className="mt-4 surface-card-quiet px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">Together</p>
            <p className="mt-0.5 text-sm text-ink">
              <span className="serif-italic text-rust">{coupleStreak}</span> day couple streak
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">Bond level</p>
            <p className="mt-0.5 font-serif text-xl text-ink">{bondLevel}</p>
          </div>
        </div>
      )}
    </header>
  );
}

function StatBadge({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-[0.16em] text-ink-mute">{label}</p>
      <p className="font-serif text-2xl text-ink leading-none">{value}</p>
      <p className="text-[10px] text-ink-mute mt-0.5">{sub}</p>
    </div>
  );
}
