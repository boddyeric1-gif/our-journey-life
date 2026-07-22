import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Share, Plus, X, HomeIcon, Sparkles } from "lucide-react";
import { usePwaInstall, markInstallDismissed, getVisitCount } from "@/hooks/use-pwa-install";
import { logPwaInstallEvent } from "@/lib/pwa.functions";

const AUTO_SHOWN_KEY = "oj:pwa:auto_shown";

/** Auto-triggered install nudge. Shown once per install-cycle after engagement. */
export function PwaInstallNudge() {
  const install = usePwaInstall();
  const [open, setOpen] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    if (!install.eligible) return;
    // Engagement gate: at least 2 sessions before auto-show.
    if (getVisitCount() < 2) return;
    try {
      if (sessionStorage.getItem(AUTO_SHOWN_KEY)) return;
    } catch { /* ignore */ }

    const t = setTimeout(() => {
      try { sessionStorage.setItem(AUTO_SHOWN_KEY, "1"); } catch { /* ignore */ }
      if (install.platform === "ios") setIosOpen(true);
      else setOpen(true);
    }, 1500);
    return () => clearTimeout(t);
  }, [install.eligible, install.platform]);

  return (
    <>
      {open && (
        <InstallCard
          onClose={(reason) => {
            setOpen(false);
            if (reason === "dismiss") markInstallDismissed();
          }}
        />
      )}
      {iosOpen && (
        <IOSInstructionsModal
          onClose={() => {
            setIosOpen(false);
            markInstallDismissed();
          }}
        />
      )}
    </>
  );
}

/** Manual trigger for settings — always renders the appropriate UI. */
export function PwaInstallTrigger({ onClose }: { onClose: () => void }) {
  const install = usePwaInstall();

  if (install.standalone) {
    return (
      <SimpleModal onClose={onClose} title="Already installed">
        <p className="text-sm text-ink-soft">
          Our Journey is already on your home screen. Open it from there for the fullest experience.
        </p>
        <button onClick={onClose} className="mt-5 btn-primary w-full">Got it</button>
      </SimpleModal>
    );
  }

  if (install.platform === "ios") {
    return <IOSInstructionsModal onClose={onClose} />;
  }

  if (install.canPromptNative) {
    return <InstallCard onClose={() => onClose()} />;
  }

  // Desktop/Android without a captured event: guidance only.
  return (
    <SimpleModal onClose={onClose} title="Install Our Journey">
      <p className="text-sm text-ink-soft">
        In your browser's menu, look for <em className="serif-italic text-rust">Install app</em> or
        {" "}<em className="serif-italic text-rust">Add to Home screen</em>.
      </p>
      <button onClick={onClose} className="mt-5 btn-primary w-full">Close</button>
    </SimpleModal>
  );
}

function InstallCard({ onClose }: { onClose: (reason: "accept" | "dismiss") => void }) {
  const install = usePwaInstall();
  const logFn = useServerFn(logPwaInstallEvent);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    logFn({ data: { outcome: "shown", platform: install.platform, userAgent: navigator.userAgent } }).catch(() => {});
  }, [logFn, install.platform]);

  async function onAccept() {
    setBusy(true);
    const outcome = await install.promptInstall();
    setBusy(false);
    if (outcome !== "unavailable") {
      logFn({ data: { outcome, platform: install.platform, userAgent: navigator.userAgent } }).catch(() => {});
    }
    onClose("accept");
  }

  function onDismiss() {
    logFn({ data: { outcome: "dismissed", platform: install.platform, userAgent: navigator.userAgent } }).catch(() => {});
    onClose("dismiss");
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-ink/60 flex items-end sm:items-center justify-center p-4 animate-rise"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      onClick={onDismiss}
    >
      <div
        className="surface-card-floating relative w-full max-w-md p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(closest-side, oklch(0.71 0.075 32 / 0.35), transparent 70%)" }}
        />
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute top-3 right-3 p-1.5 text-ink-mute hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-ink-mute">
            <Sparkles className="h-3.5 w-3.5 text-rust" aria-hidden /> A small thing
          </span>
          <h2 id="pwa-install-title" className="mt-3 font-serif text-2xl text-ink text-balance">
            Keep <em className="serif-italic text-rust">Our Journey</em> close.
          </h2>
          <p className="mt-2 text-sm text-ink-soft text-pretty">
            Add it to your home screen for quicker access — it opens like a real app,
            without the browser bar in the way.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <button onClick={onAccept} disabled={busy} className="btn-primary tap disabled:opacity-60">
              {busy ? "Adding…" : "Add to Home Screen"}
            </button>
            <button onClick={onDismiss} className="tap text-sm text-ink-soft hover:text-ink py-2">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IOSInstructionsModal({ onClose }: { onClose: () => void }) {
  const logFn = useServerFn(logPwaInstallEvent);
  useEffect(() => {
    logFn({ data: { outcome: "ios_shown", platform: "ios", userAgent: navigator.userAgent } }).catch(() => {});
  }, [logFn]);

  function handleClose() {
    logFn({ data: { outcome: "ios_dismissed", platform: "ios", userAgent: navigator.userAgent } }).catch(() => {});
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-ink/60 flex items-end sm:items-center justify-center p-4 animate-rise"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-ios-title"
      onClick={handleClose}
    >
      <div
        className="surface-card-floating relative w-full max-w-md p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(closest-side, oklch(0.82 0.09 80 / 0.28), transparent 70%)" }}
        />
        <button
          onClick={handleClose}
          aria-label="Dismiss"
          className="absolute top-3 right-3 p-1.5 text-ink-mute hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-ink-mute">
            <HomeIcon className="h-3.5 w-3.5 text-rust" aria-hidden /> Install on iPhone
          </span>
          <h2 id="pwa-ios-title" className="mt-3 font-serif text-2xl text-ink text-balance">
            Add <em className="serif-italic text-rust">Our Journey</em> to your home screen.
          </h2>
          <p className="mt-2 text-sm text-ink-soft">Three quick taps in Safari.</p>

          <ol className="mt-5 space-y-3">
            <IOSStep n={1} icon={<Share className="h-4 w-4 text-rust" aria-hidden />}>
              Tap the <em className="serif-italic text-rust not-italic font-medium">Share</em> icon at the bottom of Safari.
            </IOSStep>
            <IOSStep n={2} icon={<Plus className="h-4 w-4 text-rust" aria-hidden />}>
              Scroll down and choose <em className="serif-italic text-rust not-italic font-medium">Add to Home Screen</em>.
            </IOSStep>
            <IOSStep n={3} icon={<HomeIcon className="h-4 w-4 text-rust" aria-hidden />}>
              Tap <em className="serif-italic text-rust not-italic font-medium">Add</em> in the top-right to confirm.
            </IOSStep>
          </ol>

          <button onClick={handleClose} className="mt-6 btn-primary w-full tap">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function IOSStep({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border bg-canvas-deep/40 p-3.5">
      <span className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full bg-canvas-deep border border-border">
        <span className="serif-italic text-rust text-sm">{n}</span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1">{icon}</div>
        <p className="text-sm text-ink-soft text-pretty">{children}</p>
      </div>
    </li>
  );
}

function SimpleModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-ink/60 flex items-end sm:items-center justify-center p-4 animate-rise"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="surface-card-floating relative w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 text-ink-mute hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <h2 className="font-serif text-xl text-ink">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
