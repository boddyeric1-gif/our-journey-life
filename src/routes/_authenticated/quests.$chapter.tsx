import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { completeStep, getChapter } from "@/lib/quest.functions";
import { AppShell } from "@/components/app-shell";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { ArrowLeft, ArrowRight, Check, Users, User as UserIcon, Sparkles, X } from "lucide-react";
import { HeaderSkeleton, ListSkeleton } from "@/components/skeletons";
import { useState } from "react";
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

function ChapterPage() {
  const { chapter } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetcher = useServerFn(getChapter);
  const completer = useServerFn(completeStep);
  const q = useQuery({ queryKey: ["chapter", chapter], queryFn: () => fetcher({ data: { slug: chapter } }) });

  const [celebration, setCelebration] = useState<{ xp: number; chapterTitle: string | null } | null>(null);

  if (q.isLoading || !q.data) {
    return (
      <AppShell>
        <HeaderSkeleton />
        <div className="px-5 mt-6"><ListSkeleton rows={3} /></div>
      </AppShell>
    );
  }

  const { chapter: ch, category, steps } = q.data;

  return (
    <AppShell>
      <header className="px-5 pt-6">
        <Link to="/quests" className="inline-flex items-center gap-1.5 text-sm text-ink-mute hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> {category?.title ?? "Quests"}
        </Link>
        <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-ink-mute">Chapter {ch.position}</p>
        <h1 className="mt-1 font-serif text-3xl text-ink leading-tight text-balance">{ch.title}</h1>
        <p className="mt-2 text-sm text-ink-soft text-pretty">{ch.summary}</p>
      </header>

      <div className="px-5 mt-6 space-y-3">
        {steps.map(step => (
          <StepCard key={step.id} step={step}
            onComplete={async (body) => {
              const res = await completer({ data: { stepId: step.id, body } });
              await qc.invalidateQueries();
              if (!res.alreadyCompleted) {
                toast.success(`Step ${step.position} complete.`);
                if (res.chapterComplete) {
                  setCelebration({ xp: step.xp_reward, chapterTitle: res.chapterTitle ?? ch.title });
                }
              }
            }}
          />
        ))}
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
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-canvas hover:opacity-90"
            >
              Back to quests <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StepCard({ step, onComplete }: {
  step: any;
  onComplete: (body?: string) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const done = !!step.completion;

  return (
    <article className={`surface-card p-5 transition ${done ? "opacity-80" : ""}`}>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-medium ${done ? "bg-rust text-canvas" : "bg-canvas-deep text-ink"}`}>
          {done ? <Check className="h-3.5 w-3.5" /> : step.position}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-ink-mute">
          {step.kind === "couple" ? <><Users className="h-3 w-3" aria-hidden /> Together</> : <><UserIcon className="h-3 w-3" aria-hidden /> Solo</>}
        </span>
      </div>
      <p className="mt-3 text-sm text-ink-soft leading-relaxed text-pretty">{step.teaching}</p>
      <p className="mt-3 serif-italic text-rust">"</p>
      <p className="-mt-3 font-serif text-lg text-ink text-balance">{step.prompt}</p>
      {step.ritual && (
        <p className="mt-3 text-[12px] uppercase tracking-[0.14em] text-ink-mute">Ritual · <span className="normal-case tracking-normal text-ink-soft">{step.ritual}</span></p>
      )}

      {done ? (
        <p className="mt-4 text-sm text-ink-mute">Completed.</p>
      ) : (
        <>
          <textarea
            value={body} onChange={e => setBody(e.target.value.slice(0, 2000))}
            rows={3} placeholder="A few sentences (optional, kept private to you)."
            className="mt-4 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink outline-none focus:border-rust"
          />
          <button
            onClick={async () => { setBusy(true); try { await onComplete(body || undefined); } finally { setBusy(false); }}}
            disabled={busy}
            className="mt-3 w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Mark complete"}
          </button>
        </>
      )}
    </article>
  );
}
