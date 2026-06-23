import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getInsight } from "@/lib/quest.functions";
import { AppShell } from "@/components/app-shell";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated/insights/$slug")({
  head: () => ({
    meta: [
      { title: "Field note — Our Journey" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: InsightReader,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

function categoryFromTags(tags: string[] | null | undefined): string {
  const first = tags?.[0];
  if (!first) return "Field note";
  return first
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function InsightReader() {
  const { slug } = Route.useParams();
  const fetchInsight = useServerFn(getInsight);
  const q = useQuery({
    queryKey: ["insight", slug],
    queryFn: () => fetchInsight({ data: { slug } }),
  });

  const articleRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight;
      const total = Math.max(1, el.offsetHeight - viewport);
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setProgress(Math.min(1, scrolled / total));
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [q.data]);

  if (q.isLoading || !q.data) {
    return (
      <AppShell>
        <div className="px-5 pt-6 animate-pulse">
          <div className="h-4 w-24 bg-canvas-deep rounded" />
          <div className="mt-6 h-10 w-3/4 bg-canvas-deep rounded" />
          <div className="mt-4 h-4 w-1/2 bg-canvas-deep rounded" />
        </div>
      </AppShell>
    );
  }

  const insight = q.data.insight as {
    title: string; subtitle: string | null; body: string;
    read_minutes: number; tags: string[] | null;
  };
  const category = categoryFromTags(insight.tags);
  const paragraphs = insight.body.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

  return (
    <AppShell>
      <div
        className="fixed top-0 inset-x-0 z-30 h-[3px] bg-canvas-deep/40"
        aria-hidden
      >
        <div
          className="h-full bg-rust transition-[width] duration-150 ease-out"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <div className="px-5 pt-5">
        <Link
          to="/home"
          className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <article
        ref={articleRef}
        className="px-6 pt-8 pb-16 max-w-prose mx-auto motion-safe:animate-[fadeUp_400ms_ease-out_both]"
      >
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-ink-mute">
          <BookOpen className="h-3.5 w-3.5 text-rust" />
          <span>{category}</span>
          <span aria-hidden>·</span>
          <span>{insight.read_minutes} min read</span>
        </div>

        <h1 className="mt-5 font-serif text-[34px] leading-[1.1] text-ink text-balance">
          {insight.title}
        </h1>

        {insight.subtitle && (
          <p className="mt-4 serif-italic text-lg text-ink-soft text-pretty leading-relaxed">
            {insight.subtitle}
          </p>
        )}

        <div className="mt-8 h-px bg-canvas-deep" />

        <div className="mt-8 space-y-5 text-[17px] leading-[1.7] text-ink text-pretty font-serif">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/home"
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm text-ink hover:bg-canvas-deep transition"
          >
            Back to your quest
          </Link>
        </div>
      </article>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AppShell>
  );
}
