import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getHomeState, submitDailyResponse, submitSoloReflection } from "@/lib/home.functions";
import { AppShell } from "@/components/app-shell";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { HeaderSkeleton, HeroSkeleton } from "@/components/skeletons";
import { useDailyRealtime } from "@/hooks/use-daily-realtime";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Lock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/daily")({
  head: () => ({
    meta: [
      { title: "Today's Spark — Our Journey" },
      { name: "description", content: "One prompt a day. Both write. Both reveal together." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DailyPage,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

function DailyPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchHome = useServerFn(getHomeState);
  const submit = useServerFn(submitDailyResponse);
  const submitSolo = useServerFn(submitSoloReflection);

  const home = useQuery({ queryKey: ["home-state"], queryFn: () => fetchHome() });
  const [response, setResponse] = useState("");
  const [solo, setSolo] = useState("");

  const data = home.data;
  const coupleId = data?.kind === "paired" ? data.couple?.id ?? null : null;
  useDailyRealtime(coupleId);

  const mutate = useMutation({
    mutationFn: () => {
      if (!data || data.kind !== "paired" || !data.prompt) throw new Error("No prompt");
      return submit({ data: { promptId: data.prompt.id, body: response } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["home-state"] }); toast.success("Sealed."); setResponse(""); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
  });

  const mutateSolo = useMutation({
    mutationFn: () => {
      if (!data || data.kind !== "paired") throw new Error("Not ready");
      return submitSolo({ data: { promptId: data.prompt?.id ?? null, body: solo } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["home-state"] }); toast.success("Saved to your private timeline."); setSolo(""); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
  });

  if (!data || home.isLoading) {
    return (
      <AppShell>
        <HeaderSkeleton />
        <div className="mt-6"><HeroSkeleton /></div>
      </AppShell>
    );
  }

  if (data.kind !== "paired") {
    return (
      <AppShell>
        <div className="px-6 pt-12">
          <p className="serif-italic text-rust text-lg">Daily Spark</p>
          <h1 className="mt-3 font-serif text-3xl text-ink">Pair up to unlock today's prompt.</h1>
          <Link to="/home" className="mt-6 inline-flex items-center gap-2 text-rust">
            Go to home <ArrowLeft className="h-4 w-4 rotate-180" />
          </Link>
        </div>
      </AppShell>
    );
  }

  const prompt = data.prompt;
  const myDone = !!data.myResponse;
  const partnerBody = (data.partnerResponse as any)?.body ?? null;
  const partnerSealed = !!data.partnerHasSubmitted;
  const revealed = myDone && !!partnerBody;
  const partnerName = data.partner?.display_name ?? "Your partner";
  const day = data.daysTogether ?? null;

  return (
    <AppShell>
      <header className="px-5 pt-6 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/home" })} aria-label="Back to home" className="p-2 rounded-full hover:bg-canvas-deep">
          <ArrowLeft className="h-5 w-5 text-ink" />
        </button>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">
            {day ? `Day ${day} together · Today's Spark` : "Today's Spark"}
          </p>
          <p className="text-sm text-ink-soft">
            {new Date(data.today).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </header>

      <section className="mx-5 mt-4 surface-card p-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">{prompt?.theme}</p>
        <p className="mt-3 serif-italic text-rust text-xl">"</p>
        <h1 className="-mt-3 font-serif text-2xl text-ink leading-snug text-balance">{prompt?.body}</h1>
        {!myDone && partnerSealed && (
          <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-rust">
            {partnerName} already sealed theirs · your turn
          </p>
        )}
      </section>

      {!myDone && (
        <section className="mx-5 mt-5">
          <textarea
            value={response} onChange={e => setResponse(e.target.value.slice(0, 1000))}
            rows={6} autoFocus
            placeholder="Write softly. Three sentences is plenty."
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-base text-ink placeholder:text-ink-mute outline-none focus:border-rust"
          />
          <div className="mt-1 flex justify-between text-[11px] text-ink-mute">
            <span>Neither of you can read the other until both seal.</span>
            <span>{response.length}/1000</span>
          </div>
          <button
            onClick={() => mutate.mutate()} disabled={!response.trim() || mutate.isPending}
            className="mt-3 w-full rounded-full bg-ink px-5 py-3.5 text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-60"
          >
            {mutate.isPending ? "Sealing…" : "Seal my answer"}
          </button>
        </section>
      )}

      {myDone && !revealed && (
        <section className="mx-5 mt-5 surface-card p-6 text-center">
          <Lock className="h-6 w-6 text-rust mx-auto" />
          <h2 className="mt-3 font-serif text-2xl text-ink">
            {partnerSealed ? "Both sealed" : "Sealed"}
          </h2>
          <p className="mt-2 text-sm text-ink-soft text-pretty">
            {partnerSealed
              ? `You both arrived. Opening today together…`
              : `Your answer is waiting. When ${partnerName} arrives, today opens for both of you.`}
          </p>
          <div className="mt-4 text-left">
            <p className="text-[10px] uppercase tracking-[0.16em] text-ink-mute mb-1">Your answer</p>
            <blockquote className="serif-italic text-ink-soft border-l-2 border-clay/60 pl-3">"{data.myResponse?.body}"</blockquote>
          </div>
          {partnerSealed && (
            <div className="mt-4 text-left">
              <p className="text-[10px] uppercase tracking-[0.16em] text-ink-mute mb-1">{partnerName}</p>
              <div className="rounded-xl border border-dashed border-border bg-card/60 px-3 py-3">
                <p className="serif-italic text-ink-mute text-sm">sealed · revealing now</p>
              </div>
            </div>
          )}
        </section>
      )}

      {revealed && (
        <section className="mx-5 mt-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-rust">Revealed</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ResponseCard who="You" body={data.myResponse?.body ?? ""} />
            <ResponseCard who={partnerName} body={partnerBody ?? ""} accent />
          </div>
          {day && <p className="mt-3 text-center text-[11px] text-ink-mute">Day {day} together</p>}
        </section>
      )}

      <section className="mx-5 mt-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-rust" />
          <h2 className="font-serif text-xl text-ink">Solo reflection</h2>
        </div>
        <p className="text-sm text-ink-soft">A private journal entry, for you alone. Counts toward your streak.</p>
        {data.soloToday ? (
          <div className="mt-3 surface-card-quiet p-4">
            <p className="serif-italic text-ink-soft">"{data.soloToday.body}"</p>
            <p className="mt-2 text-[11px] text-ink-mute">Saved today · private</p>
          </div>
        ) : (
          <>
            <textarea
              value={solo} onChange={e => setSolo(e.target.value.slice(0, 2000))}
              rows={4}
              placeholder="What made you write what you wrote? Or — what would you have liked to say?"
              className="mt-3 w-full rounded-2xl border border-border bg-card px-5 py-4 text-base text-ink placeholder:text-ink-mute outline-none focus:border-rust"
            />
            <button
              onClick={() => mutateSolo.mutate()}
              disabled={!solo.trim() || mutateSolo.isPending}
              className="mt-3 w-full rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-ink hover:bg-canvas-deep disabled:opacity-60"
            >
              {mutateSolo.isPending ? "Saving…" : "Save reflection"}
            </button>
          </>
        )}
      </section>
    </AppShell>
  );
}

function ResponseCard({ who, body, accent }: { who: string; body: string; accent?: boolean }) {
  return (
    <article className={`surface-card p-5 ${accent ? "border-l-4 border-rust" : ""}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">{who}</p>
      <p className="mt-2 text-ink leading-relaxed text-pretty">{body}</p>
    </article>
  );
}
