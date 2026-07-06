import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getHomeState } from "@/lib/home.functions";
import { leaveCouple } from "@/lib/couple.functions";
import { updateCoupleGoals } from "@/lib/onboarding.functions";
import { AppShell } from "@/components/app-shell";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { HeaderSkeleton } from "@/components/skeletons";
import { supabase } from "@/integrations/supabase/client";
import { Flame, LogOut, Snowflake, Heart, X, Compass, Pencil } from "lucide-react";
import { levelFromXp } from "@/lib/xp";
import { COUPLE_UNLOCKS } from "@/lib/coupleLevel";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const GOAL_OPTIONS = [
  "Communicate better",
  "Feel closer day-to-day",
  "Repair faster after conflict",
  "Bring back playfulness",
  "Build a deeper friendship",
  "Plan our future together",
  "Reignite physical intimacy",
  "Grow trust",
];

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "You — Our Journey" },
      { name: "description", content: "Your profile on Our Journey: streak, shared goals, couple settings, and the small details that keep your space yours." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ProfilePage,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetcher = useServerFn(getHomeState);
  const leave = useServerFn(leaveCouple);
  const saveGoals = useServerFn(updateCoupleGoals);

  const [confirmLeave, setConfirmLeave] = useState(false);
  const [editGoals, setEditGoals] = useState(false);

  const q = useQuery({ queryKey: ["home-state"], queryFn: () => fetcher(), staleTime: 30_000 });
  const unpair = useMutation({
    mutationFn: () => leave(),
    onSuccess: () => { qc.invalidateQueries(); setConfirmLeave(false); toast.success("Unpaired."); },
  });
  const goalsMutation = useMutation({
    mutationFn: (goals: string[]) => saveGoals({ data: { goals } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["home-state"] }); setEditGoals(false); toast.success("Saved."); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
  });

  if (q.isError) {
    return <RouteError error={q.error as Error} reset={() => q.refetch()} />;
  }
  if (!q.data) return (<AppShell><HeaderSkeleton /></AppShell>);

  const d = q.data;
  const lvl = levelFromXp(d.totalXp);
  const goals = (d.kind === "paired" ? d.goals : []) ?? [];

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <AppShell>
      <header className="px-5 pt-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-mute">You</p>
        <h1 className="mt-2 font-serif text-3xl text-ink"><em className="serif-italic text-rust">{d.profile?.display_name ?? "Friend"}</em></h1>
        <p className="mt-1 text-sm text-ink-soft capitalize">{d.profile?.relationship_stage?.replace("_"," ") ?? "Not set"}</p>
      </header>

      <section className="mx-5 mt-6 surface-card p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Your stats</p>
        <div className="mt-3 grid grid-cols-3 gap-4">
          <Stat icon={<Flame className="h-4 w-4 text-rust" />} value={d.userStreak?.current_streak ?? 0} label="day streak" />
          <Stat icon={<Snowflake className="h-4 w-4 text-clay" />} value={d.userStreak?.freezes_available ?? 0} label="freezes" />
          <Stat icon={<Heart className="h-4 w-4 text-rust" />} value={lvl.level} label={`level · ${d.totalXp} XP`} />
        </div>
      </section>

      {d.kind === "paired" && d.coupleStreak && (
        <section className="mx-5 mt-4 surface-card-quiet p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Together</p>
          <p className="mt-2 font-serif text-2xl text-ink"><em className="serif-italic text-rust">{d.coupleStreak.current_streak}</em> day couple streak</p>
          <p className="mt-1 text-sm text-ink-soft">Longest: {d.coupleStreak.longest_streak} days · last together {d.coupleStreak.last_both_active_date ?? "—"}</p>
          {d.daysTogether && (
            <p className="mt-1 text-sm text-ink-soft">Day <em className="serif-italic text-rust">{d.daysTogether}</em> together</p>
          )}
        </section>
      )}

      {d.kind === "paired" && d.coupleProgress && (
        <section className="mx-5 mt-4 surface-card p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Both of you</p>
            <p className="text-[12px] text-ink-mute">
              Level <em className="serif-italic text-rust not-italic font-medium">{d.coupleProgress.level}</em>
              <span className="mx-1.5">·</span>
              {d.coupleProgress.sharedDays} shared days
            </p>
          </div>
          <p className="mt-2 text-sm text-ink-soft">Premium features can be earned together, or unlocked any time.</p>
          <ul className="mt-4 space-y-2.5">
            {(["quests_advanced","time_capsule","the_atlas"] as const).map(key => {
              const t = COUPLE_UNLOCKS[key];
              const unlocked = d.coupleProgress!.unlocks[key];
              const lvlOk = d.coupleProgress!.level >= t.level;
              const daysOk = d.coupleProgress!.sharedDays >= t.sharedDays;
              const label = key === "quests_advanced" ? "Advanced chapters"
                : key === "time_capsule" ? "Time Capsule" : "The Atlas";
              return (
                <li key={key} className="flex items-center justify-between gap-3 text-sm">
                  <span className={unlocked ? "text-ink" : "text-ink-soft"}>{label}</span>
                  <span className="text-[11px] text-ink-mute inline-flex items-center gap-2">
                    <span className={lvlOk ? "text-rust" : ""}>Lv {t.level} {lvlOk ? "✓" : ""}</span>
                    <span className={daysOk ? "text-rust" : ""}>{t.sharedDays}d {daysOk ? "✓" : ""}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {d.kind === "paired" && (
        <section className="mx-5 mt-4 surface-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute inline-flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-rust" aria-hidden /> Working on together
            </p>
            <button
              onClick={() => setEditGoals(true)}
              className="inline-flex items-center gap-1 text-[12px] text-ink-mute hover:text-ink"
            >
              <Pencil className="h-3 w-3" aria-hidden /> Edit
            </button>
          </div>
          {goals.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">No shared goals yet. Choose a few to shape your quests.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {goals.map(g => (
                <span key={g} className="text-[12px] px-3 py-1.5 rounded-full border border-border bg-canvas-deep/40 text-ink-soft">
                  {g}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mx-5 mt-6 space-y-2">
        <Link to="/capsule"
          className="w-full inline-flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 text-sm text-ink hover:bg-canvas-deep">
          <span>Time Capsule</span>
          <span className="text-xs text-ink-mute">Letters that wait</span>
        </Link>
        <Link to="/atlas"
          className="w-full inline-flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 text-sm text-ink hover:bg-canvas-deep">
          <span>The Atlas</span>
          <span className="text-xs text-ink-mute">Your story, gathered</span>
        </Link>
        <Link to="/premium"
          className="w-full inline-flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 text-sm text-ink hover:bg-canvas-deep">
          <span>Premium unlocks</span>
          <span className="text-xs text-ink-mute">Manage</span>
        </Link>
      </section>

      <section className="mx-5 mt-6 space-y-2">
        {d.kind === "paired" && (
          <button onClick={() => setConfirmLeave(true)}
            className="w-full inline-flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 text-sm text-ink hover:bg-canvas-deep">
            <span>Leave couple</span>
            <LogOut className="h-4 w-4 text-ink-mute" aria-hidden />
          </button>
        )}
        <button onClick={signOut}
          className="w-full inline-flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 text-sm text-ink hover:bg-canvas-deep">
          <span>Sign out</span>
          <LogOut className="h-4 w-4 text-ink-mute" aria-hidden />
        </button>
      </section>

      <section className="mx-5 mt-6 surface-card-quiet p-5">
        <h2 className="font-serif text-base text-ink">Customer support</h2>
        <p className="mt-2 text-sm text-ink-soft text-pretty">
          Experiencing a bug? Have a question or a concern? We're here 24/7 — reach out any time and we'll help you sort it out.
        </p>
        <a
          href="mailto:emb.creations.llc@gmail.com"
          className="mt-3 inline-flex items-center rounded-2xl bg-canvas-deep px-4 py-2 text-sm text-ink hover:bg-canvas-deep/80 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rust/60"
        >
          emb.creations.llc@gmail.com
        </a>
      </section>

      <p className="px-5 mt-8 text-center text-xs text-ink-mute">Our Journey · Made with care · Kept quiet</p>

      {confirmLeave && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-couple-title"
          onClick={() => !unpair.isPending && setConfirmLeave(false)}
        >
          <div className="surface-card w-full max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setConfirmLeave(false)}
              aria-label="Close"
              className="absolute top-3 right-3 p-1 text-ink-mute hover:text-ink"
              disabled={unpair.isPending}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <h3 id="leave-couple-title" className="font-serif text-xl text-ink">Leave this couple?</h3>
            <p className="mt-2 text-sm text-ink-soft text-pretty">
              Your XP and private reflections stay with you. The shared archive — letters, daily reveals, couple streak — ends.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmLeave(false)}
                disabled={unpair.isPending}
                className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-sm text-ink hover:bg-canvas-deep disabled:opacity-60"
              >
                Stay
              </button>
              <button
                onClick={() => unpair.mutate()}
                disabled={unpair.isPending}
                className="flex-1 btn-primary disabled:opacity-60"
              >
                {unpair.isPending ? "Leaving…" : "Leave"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editGoals && (
        <GoalsEditor
          initial={goals}
          busy={goalsMutation.isPending}
          onClose={() => setEditGoals(false)}
          onSave={(next) => goalsMutation.mutate(next)}
        />
      )}
    </AppShell>
  );
}

function GoalsEditor({ initial, busy, onClose, onSave }: {
  initial: string[];
  busy: boolean;
  onClose: () => void;
  onSave: (goals: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [limitHint, setLimitHint] = useState(false);
  useEffect(() => {
    if (!limitHint) return;
    const t = setTimeout(() => setLimitHint(false), 1800);
    return () => clearTimeout(t);
  }, [limitHint]);
  const toggle = (g: string) => {
    setSelected(prev => {
      if (prev.includes(g)) return prev.filter(x => x !== g);
      if (prev.length < 3) return [...prev, g];
      setLimitHint(true);
      return prev;
    });
  };
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goals-editor-title"
      onClick={() => !busy && onClose()}
    >
      <div className="surface-card w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="Close"
          disabled={busy}
          className="absolute top-3 right-3 p-1 text-ink-mute hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <h3 id="goals-editor-title" className="font-serif text-xl text-ink">What are you working on?</h3>
        <p className="mt-1 text-sm text-ink-soft">Pick up to three. We'll shape your quests around these.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {GOAL_OPTIONS.map(g => {
            const on = selected.includes(g);
            return (
              <button
                key={g}
                onClick={() => toggle(g)}
                className={`text-sm px-4 py-2 rounded-full border transition ${on ? "border-rust bg-rust text-canvas" : "border-border bg-card text-ink hover:bg-canvas-deep"}`}
              >
                {g}
              </button>
            );
          })}
        </div>
        <p
          className={`mt-3 text-xs text-ink-mute transition-opacity duration-300 ${limitHint ? "opacity-100" : "opacity-0"}`}
          aria-live="polite"
        >
          Up to three — tap one to swap it out.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-sm text-ink hover:bg-canvas-deep disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(selected)}
            disabled={busy}
            className="flex-1 btn-primary disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">{icon}<span className="font-serif text-2xl text-ink">{value}</span></div>
      <p className="text-[11px] text-ink-mute">{label}</p>
    </div>
  );
}
