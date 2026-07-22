import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type AudioPrefs = { playing: boolean; volume: number };
type AudioCtx = {
  isPlaying: boolean;
  volume: number;
  togglePlay: () => void;
  setVolume: (v: number) => void;
};

const STORAGE_KEY = "oj_audio_prefs";
const AUDIO_SRC = "/audio/lofi-ambient.mp3";

const Ctx = createContext<AudioCtx | null>(null);

function readPrefs(): AudioPrefs {
  if (typeof window === "undefined") return { playing: true, volume: 0.4 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { playing: true, volume: 0.4 };
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      playing: parsed.playing !== false,
      volume: typeof parsed.volume === "number" ? Math.min(1, Math.max(0, parsed.volume)) : 0.4,
    };
  } catch {
    return { playing: true, volume: 0.4 };
  }
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.4);

  // Create audio element once on mount (client only).
  useEffect(() => {
    const prefs = readPrefs();
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = prefs.volume;
    audioRef.current = audio;
    setVolumeState(prefs.volume);

    // Default: attempt to play on mount. If the browser blocks autoplay,
    // fall back to starting on the first user interaction.
    let cancelled = false;
    const tryPlay = () => {
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          if (!cancelled) setIsPlaying(true);
        }).catch(() => {
          // Autoplay blocked — wait for a user gesture.
          const resume = () => {
            audio
              .play()
              .then(() => {
                if (!cancelled) setIsPlaying(true);
              })
              .catch(() => {});
            window.removeEventListener("pointerdown", resume);
            window.removeEventListener("keydown", resume);
            window.removeEventListener("touchstart", resume);
          };
          window.addEventListener("pointerdown", resume, { once: true });
          window.addEventListener("keydown", resume, { once: true });
          window.addEventListener("touchstart", resume, { once: true });
        });
      }
    };

    if (prefs.playing) tryPlay();

    return () => {
      cancelled = true;
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  // Persist prefs.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ playing: isPlaying, volume } satisfies AudioPrefs),
      );
    } catch {
      /* ignore */
    }
  }, [isPlaying, volume]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } else {
        setIsPlaying(true);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const setVolume = (v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  };

  return (
    <Ctx.Provider value={{ isPlaying, volume, togglePlay, setVolume }}>{children}</Ctx.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAudio must be used inside <AudioProvider>");
  return ctx;
}
