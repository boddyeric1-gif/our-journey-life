import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getHomeState } from "@/lib/home.functions";

import { AppShell } from "@/components/app-shell";
import { LevelHeader } from "@/components/level-header";
import { TodayHero } from "@/components/today-hero";
import { LettersInbox } from "@/components/letters-inbox";
import { HeaderSkeleton, HeroSkeleton } from "@/components/skeletons";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { ArrowRight, Compass, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDailyRealtime } from "@/hooks/use-daily-realtime";
import { usePartnerPresence } from "@/hooks/use-partner-presence";
import { PartnerPresencePill } from "@/components/partner-presence-pill";
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

  const home = useQuery({ queryKey: ["home-state"], queryFn: () => fetchHome(), staleTime: 30_000 });
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

  const myIdForPresence =
    home.data && "profile" in home.data && home.data.profile ? home.data.profile.id : null;
  const partnerForPresence =
    home.data && home.data.kind === "paired" ? home.data.partner ?? null : null;
  const partnerPresence = usePartnerPresence({
    userId: myIdForPresence,
    partnerId: partnerForPresence?.id ?? null,
    initialPartnerLastActiveAt:
      (partnerForPresence as { last_active_at?: string | null } | null)?.last_active_at ?? null,
  });

  if (home.isError) {
    return <RouteError error={home.error as Error} reset={() => home.refetch()} />;
  }
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
    const soloAndNew = !data.partner && (daysTogether ?? 0) < 7;
    if (soloAndNew) {
      heroState = "unpaired";
      inviteCode = data.pendingInvite?.code;
    } else {
      // Paired OR solo-but-settled-in: promote the daily prompt to hero.
      // For soloists the invite code drops to a smaller card below.
      if (!data.partner) inviteCode = data.pendingInvite?.code;
      if (!data.myResponse) {
        heroState = "no-prompt-answered";
      } else if (data.autoUnsealed) {
        heroState = "both-done";
      } else if (data.myResponse && !partnerPreview) {
        heroState = "mine-done-partner-waiting";
      } else {
        heroState = "both-done";
      }
    }
  }

  const showSecondaryInvite =
    data.kind === "paired" && !data.partner && heroState !== "unpaired" && !!inviteCode;

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

      {data.kind === "paired" && data.partner && partnerPresence.statusLabel && (
        <PartnerPresencePill
          name={partnerName}
          status={partnerPresence.status}
          statusLabel={partnerPresence.statusLabel}
        />
      )}


      {showGoals && (
        <p className="px-5 -mt-1 mb-3 text-[12px] text-ink-mute text-pretty">
          Working on:{" "}
          <span className="text-ink-soft">{goals.slice(0, 3).join(" · ")}</span>
        </p>
      )}

      {data.kind === "paired" && data.coupleProgress?.nextUnlock && (
        <Link
          to="/profile"
          className="mx-5 mt-1 mb-3 block text-[12px] text-ink-mute hover:text-ink"
        >
          <span className="text-ink-soft">Together, Level {data.coupleProgress.level}</span>
          <span className="mx-1.5">·</span>
          {data.coupleProgress.nextUnlock.label} unlocks at Lv {data.coupleProgress.nextUnlock.levelTarget}
          {data.coupleProgress.nextUnlock.daysRemaining > 0 && (
            <> · {data.coupleProgress.nextUnlock.daysRemaining} shared day{data.coupleProgress.nextUnlock.daysRemaining === 1 ? "" : "s"} to go</>
          )}
        </Link>
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

      {showSecondaryInvite && inviteCode && (
        <InviteCodeCard code={inviteCode} />
      )}

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

      {/* Rituals — three guided prompt sets, given proper room. */}
      <section className="px-5 mt-8">
        <div className="flex items-end justify-between mb-3">
          <h2 className="font-serif text-xl text-ink">Rituals</h2>
          <span className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">Ask one tonight</span>
        </div>
        <div className="space-y-3">
          <RitualCard
            to="/resources/check-in-questions"
            eyebrow="Nightly · 5 min"
            title="Daily check-in questions"
            body="Short, honest prompts for a five-minute check-in — categorized by mood and moment."
          />
          <RitualCard
            to="/resources/would-you-rather"
            eyebrow="Low-pressure · anytime"
            title="Would you rather"
            body="Fun, deep, and relationship-focused. A small ritual you can do in the car or before sleep."
          />
          <RitualCard
            to="/resources/36-questions"
            eyebrow="Slow evening · 45 min"
            title="The 36 questions"
            body="Aron's classic sequence. Three sets that build closeness on purpose."
          />
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

function InviteCodeCard({ code }: { code: string }) {
  return (
    <div className="mx-5 mt-4 surface-card-quiet p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Invite your partner</p>
      <p className="mt-1 text-sm text-ink-soft text-pretty">
        Their view fills in once they join. Until then, today is yours.
      </p>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            toast.success("Code copied. Send it to your partner.");
          } catch { /* ignore */ }
        }}
        aria-label="Copy invite code"
        className="mt-3 w-full inline-flex items-center justify-between gap-3 rounded-2xl bg-canvas-deep px-4 py-3 hover:bg-canvas-deep/80 transition"
      >
        <span className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-ink-mute">Code</span>
        <span className="min-w-0 font-serif text-xl tracking-[0.22em] text-ink truncate">{code}</span>
        <Copy className="h-4 w-4 text-ink-mute shrink-0" aria-hidden />
      </button>
    </div>
  );
}

function RitualCard({
  to,
  eyebrow,
  title,
  body,
}: {
  to: "/resources/check-in-questions" | "/resources/would-you-rather" | "/resources/36-questions";
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="block surface-card-quiet p-5 hover:bg-canvas-deep/60 active:scale-[0.99] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rust/60"
    >
      <article className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">{eyebrow}</p>
          <h3 className="mt-1 font-serif text-lg text-ink leading-snug">{title}</h3>
          <p className="mt-1.5 text-[15px] leading-[1.55] text-ink-soft text-pretty">{body}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-ink-mute mt-1 shrink-0" />
      </article>
    </Link>
  );
}
