import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useAudio } from "./audio-provider";

export function AudioToggle() {
  const { isPlaying, volume, togglePlay, setVolume } = useAudio();
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  // Close on outside click when expanded.
  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setExpanded(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [expanded]);

  const startLongPress = () => {
    longPressed.current = false;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      setExpanded(true);
    }, 450);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const handleClick = () => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    togglePlay();
  };

  const label = isPlaying ? "Pause background music" : "Play background music";
  const Icon = isPlaying ? Volume2 : VolumeX;

  return (
    <div
      ref={wrapRef}
      className="fixed bottom-6 left-6 z-50 flex items-end gap-2 pointer-events-none"
    >
      <button
        type="button"
        aria-label={label}
        aria-pressed={isPlaying}
        onClick={handleClick}
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onContextMenu={(e) => {
          e.preventDefault();
          setExpanded((v) => !v);
        }}
        className={`pointer-events-auto tap relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-rust/25 bg-canvas-deep/85 text-rust shadow-[0_6px_20px_-8px_oklch(0.2_0.05_320/0.7)] backdrop-blur-md transition hover:bg-canvas-deep hover:border-rust/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust/60 ${
          isPlaying ? "audio-glow" : ""
        }`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </button>

      {expanded && (
        <div
          role="group"
          aria-label="Background music volume"
          className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-2 shadow-lifted backdrop-blur-md"
        >
          <VolumeX className="h-3.5 w-3.5 text-ink-mute" aria-hidden />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            aria-label="Volume"
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="oj-volume h-1.5 w-28 appearance-none rounded-full bg-canvas-deep outline-none"
            style={{
              backgroundImage: `linear-gradient(to right, var(--rust) 0%, var(--rust) ${
                volume * 100
              }%, var(--canvas-deep) ${volume * 100}%, var(--canvas-deep) 100%)`,
            }}
          />
          <Volume2 className="h-3.5 w-3.5 text-ink-soft" aria-hidden />
        </div>
      )}
    </div>
  );
}
