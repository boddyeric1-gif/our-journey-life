import { levelFromXp } from "@/lib/xp";

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
  displayName, totalXp, streak, freezes,
}: {
  displayName: string;
  totalXp: number;
  streak: number;
  freezes: number;
  coupleStreak: number | null;
  bondLevel: number | null;
}) {
  const lvl = levelFromXp(totalXp);
  const freezeLabel = freezes > 0 ? `${freezes} freeze${freezes > 1 ? "s" : ""}` : "no freezes";
  return (
    <header className="px-5 pt-6 pb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <h1 className="min-w-0 truncate font-serif text-2xl text-ink leading-tight">
        {pickGreeting(displayName)}
      </h1>
      <div className="shrink-0 flex items-center gap-2">
        <Chip label="Streak" value={`${streak}`} sub={freezeLabel} />
        <Chip label="Level" value={`${lvl.level}`} sub={`${Math.round(lvl.percent * 100)}%`} />
      </div>
    </header>
  );
}

function Chip({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-mute">{label}</p>
      <p className="font-serif text-xl text-ink leading-none">{value}</p>
      <p className="text-[10px] text-ink-mute mt-0.5">{sub}</p>
    </div>
  );
}
