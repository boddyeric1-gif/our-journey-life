import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listQuests } from "@/lib/quest.functions";
import { AppShell } from "@/components/app-shell";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { HeaderSkeleton, ListSkeleton } from "@/components/skeletons";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/quests/")({
  head: () => ({
    meta: [
      { title: "Quests — Relationship Quest" },
      { name: "description", content: "Multi-day chapters on listening, trust, repair, and the small work of love." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: QuestsPage,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

function QuestsPage() {
  const fetcher = useServerFn(listQuests);
  const q = useQuery({ queryKey: ["quests"], queryFn: () => fetcher() });

  return (
    <AppShell>
      <header className="px-5 pt-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-mute">Volume One</p>
        <h1 className="mt-2 font-serif text-3xl text-ink leading-tight"><em className="serif-italic text-rust">Quests</em> &amp; chapters</h1>
        <p className="mt-2 text-sm text-ink-soft">Multi-day journeys. Some you do alone, some together. Each is a chapter.</p>
      </header>

      {q.isLoading && (
        <>
          <HeaderSkeleton />
          <div className="px-5 mt-4"><ListSkeleton rows={4} /></div>
        </>
      )}

      <div className="px-5 mt-6 space-y-6">
        {(q.data?.categories ?? []).map(cat => {
          const chapters = (q.data?.chapters ?? []).filter(ch => ch.category_id === cat.id);
          return (
            <section key={cat.id}>
              <div className="flex items-end justify-between mb-3">
                <h2 className="font-serif text-2xl text-ink">{cat.title}</h2>
                <span className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">{cat.subtitle}</span>
              </div>
              <div className="space-y-3">
                {chapters.map(ch => {
                  const percent = ch.total > 0 ? ch.completed / ch.total : 0;
                  return (
                    <Link
                      key={ch.id} to="/quests/$chapter" params={{ chapter: ch.slug }}
                      className="block surface-card p-5 hover:bg-card/80 transition"
                    >
                      <div className="flex items-start gap-4">
                        <ProgressRing percent={percent} />
                        <div className="flex-1">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">Chapter {ch.position}</p>
                          <h3 className="mt-0.5 font-serif text-lg text-ink leading-snug">{ch.title}</h3>
                          <p className="mt-1 text-sm text-ink-soft text-pretty">{ch.summary}</p>
                          <p className="mt-2 text-[11px] text-ink-mute">{ch.completed}/{ch.total} steps</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-ink-mute mt-1" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90 shrink-0">
      <circle cx="20" cy="20" r={r} stroke="currentColor" strokeWidth="3" fill="none" className="text-canvas-deep" />
      <circle cx="20" cy="20" r={r} stroke="currentColor" strokeWidth="3" fill="none"
        className="text-rust transition-all"
        strokeDasharray={c} strokeDashoffset={c * (1 - percent)} strokeLinecap="round" />
    </svg>
  );
}
