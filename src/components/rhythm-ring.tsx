/**
 * Rhythm Ring — a 14-day honest signal of practice cadence.
 *
 * Replaces the streak counter. Each dot represents one day, oldest → newest
 * left to right. A dot can be in one of four states:
 *   - "both"    : you and your partner both contributed (filled)
 *   - "mine"    : only I contributed (half / left-filled)
 *   - "theirs"  : only my partner contributed (half / right-filled)
 *   - "empty"   : neither (hollow)
 *
 * A streak of skipped days is no longer catastrophic — the ring just shows
 * the honest shape of the last fortnight. Snowflake/freeze concept folds in:
 * a freeze is just a dot that didn't break a streak.
 */

export type RhythmDay = "both" | "mine" | "theirs" | "empty";

type Props = {
  days: RhythmDay[]; // length 14, oldest first
  paired: boolean;
};

export function RhythmRing({ days, paired }: Props) {
  const text = ariaSummary(days, paired);
  return (
    <div
      className="flex items-center gap-[3px]"
      role="img"
      aria-label={text}
      title={text}
    >
      {days.map((d, i) => (
        <Dot key={i} state={d} solo={!paired} />
      ))}
    </div>
  );
}

function Dot({ state, solo }: { state: RhythmDay; solo: boolean }) {
  // 9px dot, with a faint background ring for empty days. The "mine"/"theirs"
  // split is rendered with two half-circles so even solo users get a clean
  // filled/empty signal.
  const base = "h-[9px] w-[9px] rounded-full border border-border";
  if (state === "both" || (solo && state === "mine")) {
    return <span className={`${base} bg-rust border-rust/80`} aria-hidden />;
  }
  if (state === "mine") {
    return (
      <span
        className={`${base} bg-gradient-to-r from-rust from-50% to-canvas-deep to-50%`}
        aria-hidden
      />
    );
  }
  if (state === "theirs") {
    return (
      <span
        className={`${base} bg-gradient-to-r from-canvas-deep from-50% to-rust to-50%`}
        aria-hidden
      />
    );
  }
  return <span className={`${base} bg-transparent`} aria-hidden />;
}

function ariaSummary(days: RhythmDay[], paired: boolean): string {
  const both = days.filter(d => d === "both").length;
  const mine = days.filter(d => d === "mine").length;
  const theirs = days.filter(d => d === "theirs").length;
  if (!paired) {
    return `Rhythm: ${mine + both} of ${days.length} days reflected on in the last fortnight.`;
  }
  return `Rhythm: ${both} days together, ${mine} just you, ${theirs} just them, in the last ${days.length} days.`;
}
