/**
 * AmbientAura — soft, slow, palette-safe glow layers positioned behind content.
 * Pure CSS animations, respects prefers-reduced-motion via .aura-drift utility.
 * Only uses plum / dusk-rose / candle tokens from the design system.
 */
type Props = {
  /** "hero" = larger, warmer bloom; "screen" = softer, ambient screen wash. */
  variant?: "hero" | "screen";
  className?: string;
};

export function AmbientAura({ variant = "screen", className = "" }: Props) {
  if (variant === "hero") {
    return (
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 -z-0 overflow-hidden ${className}`}
      >
        <div className="aura-blob aura-drift absolute -top-24 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(closest-side, oklch(0.71 0.075 32 / 0.32), transparent 70%)" }}
        />
        <div className="aura-blob aura-drift-slow absolute -bottom-32 -right-24 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(closest-side, oklch(0.82 0.09 80 / 0.22), transparent 70%)" }}
        />
        <div className="aura-blob aura-drift absolute -bottom-40 -left-20 h-[380px] w-[380px] rounded-full opacity-35 blur-3xl"
          style={{ background: "radial-gradient(closest-side, oklch(0.62 0.045 295 / 0.28), transparent 70%)", animationDelay: "-4s" }}
        />
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-0 overflow-hidden ${className}`}
    >
      <div className="aura-blob aura-drift-slow absolute top-[-10%] right-[-15%] h-[460px] w-[460px] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(closest-side, oklch(0.71 0.075 32 / 0.30), transparent 70%)" }}
      />
      <div className="aura-blob aura-drift absolute bottom-[-12%] left-[-10%] h-[420px] w-[420px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(closest-side, oklch(0.62 0.045 295 / 0.28), transparent 70%)", animationDelay: "-6s" }}
      />
    </div>
  );
}
