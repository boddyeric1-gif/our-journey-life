import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getHomeState } from "@/lib/home.functions";
import { listInsights } from "@/lib/quest.functions";
import { AppShell } from "@/components/app-shell";
import { LevelHeader } from "@/components/level-header";
import { TodayHero } from "@/components/today-hero";
import { LettersInbox } from "@/components/letters-inbox";
import { HeaderSkeleton, HeroSkeleton } from "@/components/skeletons";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { ArrowRight, BookOpen, Compass } from "lucide-react";
import { useEffect, useState } from "react";
import { useDailyRealtime } from "@/hooks/use-daily-realtime";
import type { RhythmDay } from "@/components/rhythm-ring";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Your quest — Our Journey" },
      { name: "description", content: "Today's Spark, your shared rhythm, and the small next step in your quest together." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: HomePage,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

function HomePage() {
  const navigate = useNavigate();
  const fetchHome = useServerFn(getHomeState);
  const fetchInsights = useServerFn(listInsights);

  const home = useQuery({ queryKey: ["home-state"], queryFn: () => fetchHome() });
  const insights = useQuery({ queryKey: ["insights"], queryFn: () => fetchInsights() });
  const [lettersOpen, setLettersOpen] = useState(false);

  useEffect(() => {
    if (!home.data || !("profile" in home.data) || !home.data.profile) return;
    const p = home.data.profile;
    // Only redirect when required onboarding fields are truly missing.
    const missingRequired = !p.onboarded_at || !p.display_name;
    if (!missingRequired) return;
    // Prevent repeated redirects within the same browser session.
    const KEY = "onboarding-redirect-attempted";
    if (typeof window !== "undefined" && window.sessionStorage.getItem(KEY)) return;
    if (typeof window !== "undefined") window.sessionStorage.setItem(KEY, "1");
    navigate({ to: "/onboarding" });
  }, [home.data, navigate]);

  const coupleIdForRealtime =
    home.data && home.data.kind === "paired" ? home.data.couple?.id ?? null : null;
  useDailyRealtime(coupleIdForRealtime);

  if (home.isLoading || !home.data) {
    return (
      <AppShell>
        <HeaderSkeleton />
        <div className="mt-6"><HeroSkeleton /></div>
      </AppShell>
    );
  }

  const data = home.data;
  const profile = data.profile;
  const displayName = profile?.display_name ?? "friend";

  let heroState: Parameters<typeof TodayHero>[0]["state"] = "unpaired";
  let prompt: { body: string; theme: string | null } | null = null;
  let inviteCode: string | undefined;
  let partnerName: string | null = null;
  let partnerSubmitted = false;
  let myPreview: string | null = null;
  let partnerPreview: string | null = null;
  let daysTogether: number | null = null;

  if (data.kind === "paired") {
    prompt = data.prompt ? { body: data.prompt.body, theme: data.prompt.theme } : null;
    partnerName = data.partner?.display_name ?? null;
    partnerSubmitted = !!data.partnerHasSubmitted;
    daysTogether = data.daysTogether ?? null;
    myPreview = data.myResponse?.body ?? null;
    partnerPreview = (data.partnerResponse as { body?: string | null } | null)?.body ?? null;
    if (!data.partner) {
      heroState = "unpaired";
      inviteCode = data.pendingInvite?.code;
    } else if (!data.myResponse) {
      heroState = "no-prompt-answered";
    } else if (data.autoUnsealed) {
      heroState = "both-done";
    } else if (data.myResponse && !partnerPreview) {
      heroState = "mine-done-partner-waiting";
    } else {
      heroState = "both-done";
    }
  }

  const rhythm: RhythmDay[] | null =
    data.kind === "paired" ? ((data.rhythm ?? null) as RhythmDay[] | null) : null;
  const goals = data.kind === "paired" ? (data.goals ?? []) : [];
  const showGoals = goals.length > 0 && (daysTogether ?? 0) <= 28;
  const letters = data.kind === "paired" ? (data.letters ?? []) : [];
  const unreadLetters = profile
    ? letters.filter((l) => l.author_id !== profile.id && !l.seen_at).length
    : 0;

  return (
    <AppShell>
      <LevelHeader
        displayName={displayName}
        totalXp={data.totalXp}
        streak={data.userStreak?.current_streak ?? 0}
        freezes={data.userStreak?.freezes_available ?? 0}
        coupleStreak={data.kind === "paired" ? (data.coupleStreak?.current_streak ?? 0) : null}
        bondLevel={null}
        rhythm={rhythm}
        paired={data.kind === "paired" && !!data.partner}
        unreadLetters={data.kind === "paired" && !!data.partner ? unreadLetters : 0}
        onOpenLetters={data.kind === "paired" && !!data.partner ? () => setLettersOpen(true) : undefined}
      />

      {showGoals && (
        <p className="px-5 -mt-1 mb-3 text-[12px] text-ink-mute text-pretty">
          Working on:{" "}
          <span className="text-ink-soft">{goals.slice(0, 3).join(" · ")}</span>
        </p>
      )}

      {/* Single hero card — the one next decision. */}
      <div className="mt-2">
        <TodayHero
          state={heroState}
          prompt={prompt}
          inviteCode={inviteCode}
          partnerName={partnerName}
          partnerSubmitted={partnerSubmitted}
          daysTogether={daysTogether}
          myPreview={myPreview}
          partnerPreview={partnerPreview}
          autoUnsealed={data.kind === "paired" ? !!data.autoUnsealed : false}
        />
      </div>

      {data.kind === "paired" && data.nextStep && (
        <Link
          to="/quests/$chapter" params={{ chapter: data.nextStep.chapterSlug }}
          className="mx-5 mt-4 block surface-card-quiet p-5 hover:bg-canvas-deep/60 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rust/60"
        >
          <div className="flex items-start gap-3">
            <Compass className="h-5 w-5 text-rust mt-0.5" />
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">Quest in progress</p>
              <p className="mt-0.5 font-serif text-lg text-ink leading-tight">{data.nextStep.chapterTitle}</p>
              <p className="mt-1 text-sm text-ink-soft text-pretty">Step {data.nextStep.position} · {data.nextStep.kind === "couple" ? "Together" : "Solo"}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-ink-mute mt-1" />
          </div>
        </Link>
      )}

      {/* Field notes — secondary, below the fold of the next decision. */}
      <section className="px-5 mt-8">
        <div className="flex items-end justify-between mb-3">
          <h2 className="font-serif text-xl text-ink">Field notes</h2>
          <span className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">1–3 min reads</span>
        </div>
        <div className="space-y-3">
          {(insights.data?.insights ?? []).slice(0, 4).map(it => (
            <Link
              key={it.id}
              to="/insights/$slug"
              params={{ slug: it.slug }}
              className="block surface-card-quiet p-4 hover:bg-canvas-deep/60 active:scale-[0.99] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rust/60"
            >
              <article>
                <div className="flex items-start gap-3">
                  <BookOpen className="h-4 w-4 text-rust mt-1" />
                  <div className="flex-1">
                    <h3 className="font-serif text-base text-ink leading-snug">{it.title}</h3>
                    <p className="mt-1 text-[15px] leading-[1.55] text-ink-soft text-pretty">{it.subtitle}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-ink-mute">{it.read_minutes} min read</p>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* Letters as a sheet, opened from the header mail icon. */}
      {data.kind === "paired" && data.partner && profile && (
        <LettersInbox
          letters={letters}
          myId={profile.id}
          partnerName={partnerName}
          mode="sheet"
          open={lettersOpen}
          onClose={() => setLettersOpen(false)}
        />
      )}
    </AppShell>
  );
}
