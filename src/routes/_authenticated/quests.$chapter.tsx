import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { completeStep, getChapter } from "@/lib/quest.functions";
import { AppShell } from "@/components/app-shell";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { ArrowLeft, ArrowRight, Check, Users, User as UserIcon, Sparkles, X, Lock, Clock, ChevronDown } from "lucide-react";
import { HeaderSkeleton, ListSkeleton } from "@/components/skeletons";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/quests/$chapter")({
  head: ({ params }) => ({
    meta: [
      { title: `Chapter: ${params.chapter} — Our Journey` },
      { name: "description", content: "A gentle, multi-day chapter for the two of you." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ChapterPage,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

type Step = {
  id: string;
  position: number;
  kind: "solo" | "couple" | string;
  teaching: string;
  prompt: string;
  ritual: string | null;
  xp_reward: number;
  completion: { body: string | null; created_at: string } | null;
  myDone: boolean;
  partnerDone: boolean;
  requiresBoth: boolean;
  done: boolean;
};

function ChapterPage() {
  const { chapter } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetcher = useServerFn(getChapter);
  const completer = useServerFn(completeStep);

  // Poll while an awaiting-partner step is on screen so the unlock arrives
  // without manual refresh. (Partner completions aren't exposed via RLS, so
  // realtime is not viable; gentle polling is the trade-off.)
  const [awaitingPartner, setAwaitingPartner] = useState(false);
  const q = useQuery({
    queryKey: ["chapter", chapter],
    queryFn: () => fetcher({ data: { slug: chapter } }),
    refetchInterval: awaitingPartner ? 15_000 : false,
    refetchOnWindowFocus: true,
  });

  const [celebration, setCelebration] = useState<{ chapterTitle: string | null } | null>(null);
  const activeRef = useRef<HTMLDivElement | null>(null);

  const data = q.data;
  const steps = (data?.steps ?? []) as Step[];
  const activeIndex = useMemo(() => {
    const idx = steps.findIndex(s => !s.done);
    return idx === -1 ? steps.length : idx;
  }, [steps]);

  useEffect(() => {
    const active = steps[activeIndex];
    setAwaitingPartner(!!(active && active.requiresBoth && active.myDone && !active.partnerDone));
  }, [steps, activeIndex]);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIndex]);

  if (q.isLoading || !data) {
    return (
      <AppShell>
        <HeaderSkeleton />
        <div className="px-5 mt-6"><ListSkeleton rows={3} /></div>
      </AppShell>
    );
  }

  const { chapter: ch, category, partnerName } = data;

  return (
    <AppShell>
      <header className="px-5 pt-6">
        <Link to="/quests" className="inline-flex items-center gap-1.5 text-sm text-ink-mute hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> {category?.title ?? "Quests"}
        </Link>
        <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-ink-mute">Chapter {ch.position} · Step {Math.min(activeIndex + 1, steps.length)} of {steps.length}</p>
        <h1 className="mt-1 font-serif text-3xl text-ink leading-tight text-balance">{ch.title}</h1>
        <p className="mt-2 text-sm text-ink-soft text-pretty">{ch.summary}</p>
      </header>

      <div className="px-5 mt-6 space-y-3">
        {steps.map((step, i) => {
          const state: "done" | "active" | "locked" =
            i < activeIndex ? "done" : i === activeIndex ? "active" : "locked";
          return (
            <div key={step.id} ref={state === "active" ? activeRef : undefined}>
              {state === "done" && <DoneRow step={step} />}
              {state === "active" && (
                <ActiveStep
                  step={step}
                  partnerName={partnerName ?? null}
                  onComplete={async (body) => {
                    const res = await completer({ data: { stepId: step.id, body } });
                    await qc.invalidateQueries({ queryKey: ["chapter", chapter] });
                    await qc.invalidateQueries({ queryKey: ["home-state"] });
                    if (!res.alreadyCompleted) {
                      if (step.requiresBoth) {
                        toast.success("Marked on your side. Waiting for them.");
                      } else {
                        toast.success("Step complete.");
                      }
                      if (res.chapterComplete) {
                        setCelebration({ chapterTitle: res.chapterTitle ?? ch.title });
                      }
                    }
                  }}
                />
              )}
              {state === "locked" && <LockedRow step={step} />}
            </div>
          );
        })}

        {activeIndex >= steps.length && (
          <div className="surface-card-quiet p-5 text-center">
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">All steps complete</p>
            <p className="mt-2 text-sm text-ink-soft">A small archive of your work, kept.</p>
          </div>
        )}
      </div>

      {celebration && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chapter-celebration-title"
          onClick={() => setCelebration(null)}
        >
          <div className="surface-card w-full max-w-md p-7 text-center relative overflow-hidden"
               onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-rust/30 to-transparent pointer-events-none" />
            <button onClick={() => setCelebration(null)} aria-label="Close"
                    className="absolute top-3 right-3 p-1 text-ink-mute hover:text-ink">
              <X className="h-4 w-4" aria-hidden />
            </button>
            <Sparkles className="h-6 w-6 text-rust mx-auto relative" aria-hidden />
            <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-ink-mute">Chapter complete</p>
            <h2 id="chapter-celebration-title" className="mt-2 font-serif text-3xl text-ink leading-tight text-balance">
              <em className="serif-italic text-rust">{celebration.chapterTitle}</em>
            </h2>
            <p className="mt-3 text-sm text-ink-soft">
              A small archive of your work, kept. Take the win — then take a breath.
            </p>
            <button
              onClick={() => { setCelebration(null); navigate({ to: "/quests" }); }}
              className="mt-6 w-full btn-primary"
            >
              Back to quests <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function KindLabel({ kind }: { kind: string }) {
  if (kind === "couple") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-ink-mute">
        <Users className="h-3 w-3" aria-hidden /> Together
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-ink-mute">
      <UserIcon className="h-3 w-3" aria-hidden /> Solo
    </span>
  );
}

function DoneRow({ step }: { step: Step }) {
  const [open, setOpen] = useState(false);
  const panelId = `done-step-${step.id}`;
  const completedAt = step.completion?.created_at
    ? new Date(step.completion.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <div className="rounded-2xl border border-border bg-canvas-deep/40">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full px-4 py-3 flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-rust/60 rounded-2xl"
      >
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-rust text-canvas shrink-0">
          <Check className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="flex-1 min-w-0 text-sm text-ink truncate opacity-80">
          Step {step.position} · {step.kind === "couple" ? "Together" : "Solo"}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-ink-mute shrink-0">
          {open ? "Hide" : "Re-read"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </span>
      </button>

      {open && (
        <div id={panelId} className="px-4 pb-4 pt-1 opacity-90">
          <div className="rounded-xl bg-card/50 p-4">
            <KindLabel kind={step.kind} />
            <p className="mt-2 text-[15px] leading-[1.6] text-ink-soft text-pretty">{step.teaching}</p>
            <p className="mt-3 serif-italic text-rust" aria-hidden>"</p>
            <p className="-mt-3 font-serif text-[18px] leading-snug text-ink text-balance">{step.prompt}</p>
            {step.ritual && (
              <p className="mt-3 text-[12px] uppercase tracking-[0.14em] text-ink-mute">
                Ritual · <span className="normal-case tracking-normal text-ink-soft">{step.ritual}</span>
              </p>
            )}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Your reflection</p>
              {step.completion?.body ? (
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-[1.6] text-ink-soft text-pretty">
                  {step.completion.body}
                </p>
              ) : (
                <p className="mt-2 text-sm text-ink-mute italic">No note saved.</p>
              )}
              {completedAt && (
                <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-ink-mute">
                  Marked done · {completedAt}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LockedRow({ step }: { step: Step }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 px-4 py-3 flex items-center gap-3">
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-canvas-deep text-ink-mute text-[11px] font-medium">
        {step.position}
      </span>
      <div className="flex-1 min-w-0 text-sm text-ink-mute">
        Step {step.position} · {step.kind === "couple" ? "Together" : "Solo"}
      </div>
      <Lock className="h-4 w-4 text-ink-mute" aria-hidden />
    </div>
  );
}

function ActiveStep({ step, partnerName, onComplete }: {
  step: Step;
  partnerName: string | null;
  onComplete: (body?: string) => Promise<void>;
}) {
  const [body, setBody] = useState(step.completion?.body ?? "");
  const [busy, setBusy] = useState(false);

  // Two phases for together steps:
  //  - mine pending → "Mark done on my side"
  //  - mine done, partner pending → waiting state
  const waitingForPartner = step.requiresBoth && step.myDone && !step.partnerDone;
  const partnerLabel = partnerName ?? "your partner";

  // Soft word-count floor. The submit button is enabled either when the
  // reflection is empty (the step still allows complete-with-no-text) OR
  // when it's substantive (~40+ words). Stops two-word reflections that
  // erase the step without any thinking.
  const wordCount = body.trim() === "" ? 0 : body.trim().split(/\s+/).length;
  const SOFT_FLOOR = 40;
  const tooShort = wordCount > 0 && wordCount < SOFT_FLOOR;

  return (
    <article className="surface-card p-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-medium bg-canvas-deep text-ink">
          {step.position}
        </span>
        <KindLabel kind={step.kind} />
      </div>
      <p className="mt-3 text-[15px] leading-[1.6] text-ink-soft text-pretty">{step.teaching}</p>
      <p className="mt-3 serif-italic text-rust" aria-hidden>"</p>
      <p className="-mt-3 font-serif text-[20px] leading-snug text-ink text-balance">{step.prompt}</p>
      {step.ritual && (
        <p className="mt-3 text-[12px] uppercase tracking-[0.14em] text-ink-mute">
          Ritual · <span className="normal-case tracking-normal text-ink-soft">{step.ritual}</span>
        </p>
      )}

      {waitingForPartner ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-canvas-deep/40 px-4 py-4 text-center">
          <Clock className="h-4 w-4 text-ink-mute mx-auto" aria-hidden />
          <p className="mt-2 text-sm text-ink-soft">
            You marked this done. Waiting for <em className="serif-italic text-rust">{partnerLabel}</em>.
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-ink-mute">
            This step unlocks when they confirm.
          </p>
        </div>
      ) : (
        <>
          {step.requiresBoth && step.partnerDone && !step.myDone && (
            <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-rust">
              {partnerLabel} already marked this done · your turn
            </p>
          )}
          <textarea
            value={body}
            onChange={e => setBody(e.target.value.slice(0, 2000))}
            rows={4}
            placeholder="A few sentences. Slow is fine — what you write here is only ever yours."
            className="mt-4 w-full rounded-xl border border-border bg-card px-4 py-3 text-[16px] leading-[1.6] text-ink outline-none focus:border-rust"
            disabled={step.myDone}
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-mute">
            <span aria-live="polite">
              {wordCount === 0
                ? "Optional — but most of the work happens here."
                : tooShort
                  ? `Take your time · ${wordCount}/${SOFT_FLOOR}+ words`
                  : `${wordCount} words · ready when you are`}
            </span>
            <span>{body.length}/2000</span>
          </div>
          <button
            onClick={async () => {
              setBusy(true);
              try { await onComplete(body || undefined); }
              finally { setBusy(false); }
            }}
            disabled={busy || step.myDone || tooShort}
            className="mt-3 w-full btn-primary disabled:opacity-50"
          >
            {busy
              ? "Saving…"
              : step.requiresBoth
                ? "Mark done on my side"
                : "Mark complete"}
          </button>
        </>
      )}
    </article>
  );
}
