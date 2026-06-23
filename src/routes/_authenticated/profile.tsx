import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getHomeState } from "@/lib/home.functions";
import { leaveCouple } from "@/lib/couple.functions";
import { updateCoupleGoals } from "@/lib/onboarding.functions";
import { AppShell } from "@/components/app-shell";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { supabase } from "@/integrations/supabase/client";
import { Flame, LogOut, Snowflake, Heart, X, Compass, Pencil } from "lucide-react";
import { levelFromXp } from "@/lib/xp";
import { toast } from "sonner";
import { useState } from "react";

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
      { name: "description", content: "Your profile, streak, and settings." },
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

  const q = useQuery({ queryKey: ["home-state"], queryFn: () => fetcher() });
  const unpair = useMutation({
    mutationFn: () => leave(),
    onSuccess: () => { qc.invalidateQueries(); setConfirmLeave(false); toast.success("Unpaired."); },
  });
  const goalsMutation = useMutation({
    mutationFn: (goals: string[]) => saveGoals({ data: { goals } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["home-state"] }); setEditGoals(false); toast.success("Saved."); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
  });

  if (!q.data) return (<AppShell><div className="p-10 text-ink-mute">Loading…</div></AppShell>);

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
        <h2 className="font-serif text-base text-ink">How streaks work</h2>
        <p className="mt-2 text-sm text-ink-soft text-pretty">
          Any meaningful action keeps your streak alive. The couple streak only advances when both of you engage. Freezes auto-save one missed day.
        </p>
      </section>

      <p className="px-5 mt-8 text-center text-xs text-ink-mute">Our Journey · Volume One · Beta</p>

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
                className="flex-1 rounded-full bg-ink px-5 py-3 text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-60"
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
  const toggle = (g: string) => {
    setSelected(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : prev.length < 3 ? [...prev, g] : prev,
    );
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
            className="flex-1 rounded-full bg-ink px-5 py-3 text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-60"
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
