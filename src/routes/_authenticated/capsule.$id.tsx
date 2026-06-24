import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getTimeCapsule, deleteTimeCapsule } from "@/lib/timeCapsule.functions";
import { AppShell } from "@/components/app-shell";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { ArrowLeft, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/capsule/$id")({
  head: () => ({ meta: [{ title: "Capsule — Our Journey" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: CapsuleDetail,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

function fmtCountdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Opening now";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}, ${hours}h`;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${mins}m`;
}

function CapsuleDetail() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { id } = Route.useParams();
  const fetchOne = useServerFn(getTimeCapsule);
  const del = useServerFn(deleteTimeCapsule);

  const q = useQuery({
    queryKey: ["time-capsule", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!q.data || q.data.unlocked) return;
    const t = setInterval(() => setTick(x => x + 1), 60_000);
    return () => clearInterval(t);
  }, [q.data?.unlocked]);

  const deleteMut = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed.");
      qc.invalidateQueries({ queryKey: ["time-capsules"] });
      navigate({ to: "/capsule" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (q.isLoading) return <AppShell><div className="px-5 pt-10 text-ink-mute">Opening…</div></AppShell>;
  if (q.isError) return <AppShell><div className="px-5 pt-10 text-rust">{(q.error as Error).message}</div></AppShell>;

  const c = q.data!;
  void tick;

  return (
    <AppShell>
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/capsule" })} className="text-ink-mute" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">
          {c.unlocked ? "Opened" : "Sealed"}
        </span>
      </header>

      <article className="px-5">
        <h1 className="font-serif text-2xl text-ink">{c.title}</h1>
        <p className="mt-1 text-xs text-ink-mute">
          {c.mine ? "Sealed by you" : "Sealed by your partner"} · created {new Date(c.created_at).toLocaleDateString()}
        </p>

        {!c.unlocked ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
            <Lock className="mx-auto h-6 w-6 text-rust" />
            <p className="mt-3 font-serif text-lg text-ink">Opens {new Date(c.unlock_at).toLocaleDateString()}</p>
            <p className="mt-1 text-sm text-ink-mute">{fmtCountdown(c.unlock_at)}</p>
            {c.mine && (
              <p className="mt-4 text-xs text-ink-mute italic">
                Only you can see the contents until it opens.
              </p>
            )}
          </div>
        ) : null}

        {(c.unlocked || c.mine) && c.kind === 'letter' && c.body && (
          <div className="mt-8 surface-card p-5">
            <p className="font-serif text-ink leading-relaxed whitespace-pre-wrap text-pretty">{c.body}</p>
          </div>
        )}

        {(c.unlocked || c.mine) && c.kind === 'voice' && c.audioUrl && (
          <div className="mt-8 surface-card p-5">
            <audio src={c.audioUrl} controls className="w-full" />
            {c.audio_duration_sec && (
              <p className="mt-2 text-xs text-ink-mute text-center">{c.audio_duration_sec}s</p>
            )}
          </div>
        )}

        {c.mine && !c.unlocked && (
          <button
            onClick={() => {
              if (confirm("Delete this capsule? It can't be undone.")) deleteMut.mutate();
            }}
            className="mt-8 inline-flex items-center gap-2 text-sm text-rust"
          >
            <Trash2 className="h-4 w-4" /> Delete capsule
          </button>
        )}
      </article>
    </AppShell>
  );
}
