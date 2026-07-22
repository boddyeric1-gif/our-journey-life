import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const LS_DISMISSED_AT = "oj:pwa:dismissed_at";
const LS_VISITS = "oj:pwa:visits";
const LS_LAST_VISIT = "oj:pwa:last_visit";
const LS_INSTALLED = "oj:pwa:installed";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_GAP_MS = 30 * 60 * 1000; // 30 min between sessions

export type PwaPlatform = "android" | "ios" | "desktop" | "unknown";

export function detectPlatform(): PwaPlatform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  // iOS Safari: not in-app browsers (no CriOS/FxiOS/EdgiOS)
  const isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  if (isIOSSafari) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mm = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as any).standalone === true;
  return !!(mm || iosStandalone);
}

function bumpVisitCounter() {
  try {
    const now = Date.now();
    const last = Number(localStorage.getItem(LS_LAST_VISIT) || 0);
    if (!last || now - last > SESSION_GAP_MS) {
      const count = Number(localStorage.getItem(LS_VISITS) || 0) + 1;
      localStorage.setItem(LS_VISITS, String(count));
    }
    localStorage.setItem(LS_LAST_VISIT, String(now));
  } catch {
    // ignore
  }
}

export function getVisitCount(): number {
  try { return Number(localStorage.getItem(LS_VISITS) || 0); } catch { return 0; }
}

export function markInstallDismissed() {
  try { localStorage.setItem(LS_DISMISSED_AT, String(Date.now())); } catch { /* ignore */ }
}

export function clearInstallDismissed() {
  try { localStorage.removeItem(LS_DISMISSED_AT); } catch { /* ignore */ }
}

function isRecentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(LS_DISMISSED_AT) || 0);
    if (!at) return false;
    return Date.now() - at < DISMISS_COOLDOWN_MS;
  } catch { return false; }
}

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<PwaPlatform>("unknown");
  const [standalone, setStandalone] = useState<boolean>(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setStandalone(isStandalone());
    bumpVisitCounter();

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      try { localStorage.setItem(LS_INSTALLED, "1"); } catch { /* ignore */ }
      setDeferred(null);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferred) return "unavailable";
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      return choice.outcome;
    } catch {
      return "dismissed";
    }
  }, [deferred]);

  const canPromptNative = !!deferred;
  const eligible =
    !standalone &&
    !isRecentlyDismissed() &&
    (platform === "ios" || canPromptNative);

  return {
    platform,
    standalone,
    canPromptNative,
    eligible,
    promptInstall,
    visitCount: getVisitCount(),
  };
}
