import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listTimeCapsules } from "@/lib/timeCapsule.functions";
import { getCoupleEntitlements } from "@/lib/payments.functions";
import { AppShell } from "@/components/app-shell";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { TrialCta, TrialBanner } from "@/components/trial-cta";
import { Lock, Mic, Mail, Plus, Clock } from "lucide-react";


export const Route = createFileRoute("/_authenticated/capsule/")({
  head: () => ({
    meta: [
      { title: "Time Capsule — Our Journey" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CapsuleIndex,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

function daysUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "any moment";
  if (days === 1) return "tomorrow";
  if (days < 30) return `in ${days} days`;
  if (days < 365) return `in ${Math.round(days / 30)} months`;
  return `in ${Math.round(days / 365)} years`;
}

function CapsuleIndex() {
  const fetchEnt = useServerFn(getCoupleEntitlements);
  const fetchList = useServerFn(listTimeCapsules);
  const ent = useQuery({ queryKey: ["entitlements"], queryFn: () => fetchEnt(), staleTime: 30_000 });

  const owns = ent.data?.timeCapsule ?? false;

  const list = useQuery({
    queryKey: ["time-capsules"],
    queryFn: () => fetchList(),
    enabled: owns,
    staleTime: 15_000,
  });

  if (!ent.isLoading && !owns) {
    const p = ent.data?.progress;
    const trial = ent.data?.trials?.timeCapsule;
    const hasCouple = Boolean(ent.data?.coupleId);
    const t = { level: 11, sharedDays: 21 };
    return (
      <AppShell>
        <div className="px-5 pt-10">
          <p className="serif-italic text-rust">Premium</p>
          <h1 className="mt-2 font-serif text-3xl text-ink">The Time Capsule</h1>
          <p className="mt-3 text-sm text-ink-soft leading-relaxed">
            Sealed letters and voice notes that unlock on a future date — an anniversary,
            a birthday, the quiet moment you'll want them most.
          </p>

          {trial && (
            <TrialCta
              product="time_capsule"
              eligible={trial.eligible}
              mine={trial.mine}
              hasCouple={hasCouple}
            />
          )}

          {p && (
            <div className="mt-6 surface-card-quiet p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Earn it together</p>
              <p className="mt-2 text-sm text-ink-soft">
                Reach <em className="serif-italic text-rust not-italic">Level {t.level}</em> and{" "}
                <em className="serif-italic text-rust not-italic">{t.sharedDays} shared days</em> together.
              </p>
              <p className="mt-2 text-[12px] text-ink-mute">
                You're at Level {p.level} · {p.sharedDays} shared days.
              </p>
            </div>
          )}

          <Link
            to="/premium"
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-ink py-3.5 text-sm font-medium text-canvas"
          >
            Or unlock the Capsule now
          </Link>
        </div>
      </AppShell>
    );
  }


  const sealed = list.data?.sealed ?? [];
  const opened = list.data?.opened ?? [];

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4">
        <p className="serif-italic text-rust">Premium</p>
        <h1 className="mt-1 font-serif text-2xl text-ink">The Time Capsule</h1>
        <p className="mt-2 text-sm text-ink-mute leading-relaxed">
          Letters and voice notes that wait for you.
        </p>
      </header>

      <div className="px-5">
        <Link
          to="/capsule/new"
          className="flex items-center justify-between rounded-2xl border border-dashed border-border bg-card px-5 py-4 text-sm text-ink hover:bg-canvas-deep"
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4 text-rust" /> Seal a new capsule
          </span>
        </Link>
      </div>

      <section className="px-5 mt-8">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Sealed</h2>
        {sealed.length === 0 ? (
          <p className="mt-3 text-sm text-ink-mute italic">Nothing waiting yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {sealed.map(c => (
              <li key={c.id}>
                <Link
                  to="/capsule/$id"
                  params={{ id: c.id }}
                  className="block surface-card p-4 hover:bg-canvas-deep transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-serif text-ink truncate">{c.title}</p>
                      <p className="mt-1 text-xs text-ink-mute inline-flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> Opens {daysUntil(c.unlock_at)}
                      </p>
                    </div>
                    <span className="text-ink-mute shrink-0">
                      {c.kind === "voice"
                        ? <Mic className="h-4 w-4" />
                        : <Mail className="h-4 w-4" />}
                    </span>
                  </div>
                  {!c.mine && (
                    <p className="mt-2 text-[11px] text-rust inline-flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Sealed by your partner
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="px-5 mt-8">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Opened</h2>
        {opened.length === 0 ? (
          <p className="mt-3 text-sm text-ink-mute italic">When sealed capsules open, they'll appear here.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {opened.map(c => (
              <li key={c.id}>
                <Link
                  to="/capsule/$id"
                  params={{ id: c.id }}
                  className="block surface-card p-4 hover:bg-canvas-deep transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-serif text-ink truncate">{c.title}</p>
                      <p className="mt-1 text-xs text-ink-mute">
                        Opened {new Date(c.unlock_at).toLocaleDateString()}
                      </p>
                      {c.body_preview && (
                        <p className="mt-2 text-sm text-ink-soft italic line-clamp-2">
                          {c.body_preview}
                        </p>
                      )}
                    </div>
                    <span className="text-ink-mute shrink-0">
                      {c.kind === "voice"
                        ? <Mic className="h-4 w-4" />
                        : <Mail className="h-4 w-4" />}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
