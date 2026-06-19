import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getHomeState } from "@/lib/home.functions";
import { leaveCouple } from "@/lib/couple.functions";
import { AppShell } from "@/components/app-shell";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { supabase } from "@/integrations/supabase/client";
import { Flame, LogOut, Snowflake, Heart } from "lucide-react";
import { levelFromXp } from "@/lib/xp";
import { toast } from "sonner";

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

  const q = useQuery({ queryKey: ["home-state"], queryFn: () => fetcher() });
  const unpair = useMutation({
    mutationFn: () => leave(),
    onSuccess: () => { qc.invalidateQueries(); toast.success("Unpaired."); },
  });

  if (!q.data) return (<AppShell><div className="p-10 text-ink-mute">Loading…</div></AppShell>);

  const d = q.data;
  const lvl = levelFromXp(d.totalXp);

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

      <section className="mx-5 mt-6 surface-card-quiet p-5">
        <h2 className="font-serif text-lg text-ink">How streaks work</h2>
        <p className="mt-2 text-sm text-ink-soft text-pretty">
          Your streak is <em className="serif-italic text-rust">yours</em>. Any meaningful action — a Spark, a solo reflection, a quest step — keeps it alive. The <em className="serif-italic text-rust">couple streak</em> only advances when both of you engage, but it never costs you yours.
        </p>
        <p className="mt-2 text-sm text-ink-soft">Streaks roll over at midnight in your local timezone. Freezes auto-save a single missed day.</p>
      </section>

      <section className="mx-5 mt-6 space-y-2">
        {d.kind === "paired" && (
          <button onClick={() => { if (confirm("Leave this couple? Your XP and reflections stay; the bond ends.")) unpair.mutate(); }}
            className="w-full inline-flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 text-sm text-ink hover:bg-canvas-deep">
            <span>Leave couple</span>
            <LogOut className="h-4 w-4 text-ink-mute" />
          </button>
        )}
        <button onClick={signOut}
          className="w-full inline-flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 text-sm text-ink hover:bg-canvas-deep">
          <span>Sign out</span>
          <LogOut className="h-4 w-4 text-ink-mute" />
        </button>
      </section>

      <p className="px-5 mt-8 text-center text-xs text-ink-mute">Our Journey · Volume One · Beta</p>
    </AppShell>
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
