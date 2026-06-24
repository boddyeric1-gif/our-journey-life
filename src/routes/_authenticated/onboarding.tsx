import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { saveOnboarding, saveFirstLetter } from "@/lib/onboarding.functions";
import { createCouple } from "@/lib/couple.functions";
import { getHomeState } from "@/lib/home.functions";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { toast } from "sonner";
import { ArrowRight, Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Begin your quest — Our Journey" },
      { name: "description", content: "A few quiet questions to set up your quest together." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OnboardingPage,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

type Stage = "dating" | "engaged" | "married" | "long_term";
type LL = "words" | "acts" | "gifts" | "time" | "touch";

const STAGES: { value: Stage; label: string; sub: string }[] = [
  { value: "dating", label: "Dating", sub: "Still discovering." },
  { value: "engaged", label: "Engaged", sub: "On the threshold." },
  { value: "married", label: "Married", sub: "In the long middle." },
  { value: "long_term", label: "Long together", sub: "Years deep, unmarried." },
];
const LANGS: { value: LL; label: string }[] = [
  { value: "words", label: "Words of affirmation" },
  { value: "acts", label: "Acts of service" },
  { value: "time", label: "Quality time" },
  { value: "touch", label: "Physical touch" },
  { value: "gifts", label: "Thoughtful gifts" },
];
const GOALS = [
  "Communicate better",
  "Feel closer day-to-day",
  "Repair faster after conflict",
  "Bring back playfulness",
  "Build a deeper friendship",
  "Plan our future together",
  "Reignite physical intimacy",
  "Grow trust",
];

// Eyebrow labels keyed by step index. Single source of truth so step renumber
// doesn't require touching every block.
const EYEBROWS = ["One", "Two", "Three", "Four", "Five", "Six · the magic moment", "Seven · sent"] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const home = useQuery({ queryKey: ["home-state"], queryFn: useServerFn(getHomeState) });

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [intention, setIntention] = useState("");
  const [stage, setStage] = useState<Stage>("dating");
  const [anniversary, setAnniversary] = useState("");
  const [loveLang, setLoveLang] = useState<LL | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [goalsLimitHint, setGoalsLimitHint] = useState(false);
  useEffect(() => {
    if (!goalsLimitHint) return;
    const t = setTimeout(() => setGoalsLimitHint(false), 1800);
    return () => clearTimeout(t);
  }, [goalsLimitHint]);
  const [letter, setLetter] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const saveFn = useServerFn(saveOnboarding);
  const createCoupleFn = useServerFn(createCouple);
  const letterFn = useServerFn(saveFirstLetter);

  const homeData = home.data;
  const profileData = homeData && "profile" in homeData ? homeData.profile : null;
  const alreadyOnboarded = !!profileData?.onboarded_at;
  const isPaired = homeData?.kind === "paired" && !!homeData.partner;
  const isJoiningPartner = homeData?.kind === "paired" && !!homeData.partner && !alreadyOnboarded;
  const isOnboardedSolo = alreadyOnboarded && homeData?.kind === "paired" && !homeData.partner;

  useEffect(() => {
    if (!name && profileData?.display_name) setName(profileData.display_name);
  }, [profileData?.display_name, name]);

  useEffect(() => {
    if (alreadyOnboarded && isPaired) navigate({ to: "/home" });
  }, [alreadyOnboarded, isPaired, navigate]);

  useEffect(() => {
    if (isOnboardedSolo && homeData?.kind === "paired" && homeData.pendingInvite && step === 0) {
      setInviteCode(homeData.pendingInvite.code);
      setStep(6);
    }
  }, [isOnboardedSolo, homeData, step]);

  const totalSteps = 7;
  const next = () => setStep(s => Math.min(s + 1, totalSteps - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  function detectTz(): string {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
    catch { return "UTC"; }
  }

  const finalize = useMutation({
    mutationFn: async () => {
      const tz = detectTz();
      const payload = {
        displayName: name,
        stage,
        anniversary: anniversary || null,
        loveLanguage: loveLang,
        goals,
        firstLetter: null,
        timezone: tz,
        journeyIntention: intention.trim() || null,
      };
      if (isJoiningPartner && homeData?.kind === "paired" && homeData.couple) {
        const coupleId = homeData.couple.id;
        await saveFn({ data: payload });
        if (letter.trim()) await letterFn({ data: { coupleId, body: letter } });
        await qc.invalidateQueries();
        return { coupleId, inviteCode: null as string | null };
      }
      const cc = await createCoupleFn({ data: {} });
      setInviteCode(cc.inviteCode);
      await saveFn({ data: payload });
      if (letter.trim()) await letterFn({ data: { coupleId: cc.coupleId, body: letter } });
      await qc.invalidateQueries();
      return cc;
    },
    onSuccess: () => {
      if (isJoiningPartner) navigate({ to: "/home" });
      else setStep(totalSteps - 1);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
  });

  return (
    <main className="relative z-10 min-h-[100svh] max-w-md mx-auto px-6 pb-10">
      <header className="pt-8 flex items-center justify-between">
        <p className="serif-italic text-rust text-lg">Our Journey</p>
        <p className="text-xs text-ink-mute uppercase tracking-[0.18em]">{step + 1}/{totalSteps}</p>
      </header>

      <div className="mt-4 h-1 w-full bg-canvas-deep rounded-full overflow-hidden">
        <div className="h-full bg-rust transition-all" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
      </div>

      <div className="mt-8">
        {step === 0 && (
          <StepBlock eyebrow={EYEBROWS[0]} title={<><em className="serif-italic text-rust">Hi.</em> What should we call you?</>}>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name" autoFocus
              className="mt-6 w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg text-ink placeholder:text-ink-mute outline-none focus:border-rust"
            />
            <Continue disabled={!name.trim()} onClick={next} />
          </StepBlock>
        )}

        {step === 1 && (
          <StepBlock eyebrow={EYEBROWS[1]} title={<>In one line — <em className="serif-italic text-rust">why are you here</em>?</>}>
            <p className="text-[15px] leading-[1.55] text-ink-soft mt-3 text-pretty">
              For your eyes only. We'll bring this back at 30, 60, and 90 days so you can see what shifted.
            </p>
            <textarea
              value={intention}
              onChange={e => setIntention(e.target.value.slice(0, 240))}
              placeholder="I want us to remember how to listen…"
              rows={4}
              autoFocus
              className="mt-5 w-full rounded-2xl border border-border bg-card px-4 py-4 text-[16px] leading-[1.55] text-ink placeholder:text-ink-mute outline-none focus:border-rust serif-italic"
            />
            <p className="mt-1 text-right text-[11px] text-ink-mute">{intention.length}/240</p>
            <Continue onClick={next} />
            <button onClick={next} className="mt-2 w-full text-sm text-ink-mute hover:text-ink">
              I'd rather skip
            </button>
          </StepBlock>
        )}

        {step === 2 && (
          <StepBlock eyebrow={EYEBROWS[2]} title={<>Where are you <em className="serif-italic text-rust">together</em>?</>}>
            <div className="mt-6 space-y-2">
              {STAGES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStage(s.value)}
                  className={`w-full text-left p-4 rounded-2xl border transition ${stage===s.value ? "border-rust bg-card" : "border-border bg-canvas-deep/40"}`}
                >
                  <p className="font-serif text-lg text-ink">{s.label}</p>
                  <p className="text-sm text-ink-mute">{s.sub}</p>
                </button>
              ))}
            </div>
            <label className="block mt-6">
              <span className="text-xs uppercase tracking-[0.14em] text-ink-mute">Anniversary (optional)</span>
              <input type="date" value={anniversary} onChange={e => setAnniversary(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-border bg-card px-4 py-3 text-base text-ink outline-none focus:border-rust" />
            </label>
            <Continue onClick={next} />
          </StepBlock>
        )}

        {step === 3 && (
          <StepBlock eyebrow={EYEBROWS[3]} title={<>What would you like <em className="serif-italic text-rust">to grow</em>?</>}>
            <p className="text-sm text-ink-soft mt-3">Pick up to three. We'll shape your quests around these.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {GOALS.map(g => {
                const on = goals.includes(g);
                return (
                  <button
                    key={g}
                    onClick={() => {
                      if (goals.includes(g)) {
                        setGoals(prev => prev.filter(x => x !== g));
                      } else if (goals.length < 3) {
                        setGoals(prev => [...prev, g]);
                      } else {
                        setGoalsLimitHint(true);
                      }
                    }}
                    className={`text-sm px-4 py-2 rounded-full border transition ${on ? "border-rust bg-rust text-canvas" : "border-border bg-card text-ink hover:bg-canvas-deep"}`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
            <p
              className={`mt-3 text-xs text-ink-mute transition-opacity duration-300 ${goalsLimitHint ? "opacity-100" : "opacity-0"}`}
              aria-live="polite"
            >
              Up to three — tap one to swap it out.
            </p>
            <Continue disabled={goals.length === 0} onClick={next} />
          </StepBlock>
        )}

        {step === 4 && (
          <StepBlock eyebrow={EYEBROWS[4]} title={<>Which one do you <em className="serif-italic text-rust">reach for first</em>?</>}>
            <p className="text-sm text-ink-soft mt-3">You'll likely move between these. This is just a starting point — you can revisit anytime.</p>
            <div className="mt-5 space-y-2">
              {LANGS.map(l => (
                <button key={l.value} onClick={() => setLoveLang(l.value)}
                  className={`w-full text-left p-4 rounded-2xl border transition ${loveLang===l.value ? "border-rust bg-card" : "border-border bg-canvas-deep/40"}`}>
                  <p className="text-ink">{l.label}</p>
                </button>
              ))}
            </div>
            <Continue onClick={next} />
          </StepBlock>
        )}

        {step === 5 && (
          <StepBlock
            eyebrow={isJoiningPartner ? "Six · your reply" : EYEBROWS[5]}
            title={
              isJoiningPartner
                ? <>Write them back <em className="serif-italic text-rust">one line</em>.</>
                : <>Write your partner <em className="serif-italic text-rust">one line</em>.</>
            }
          >
            <p className="text-sm text-ink-soft mt-3">
              {isJoiningPartner
                ? "They'll see this on Home. Soft and true is enough."
                : "It'll be the first thing they see when they accept your invite. Soft and true is enough."}
            </p>
            <textarea
              value={letter} onChange={e => setLetter(e.target.value.slice(0, 280))}
              placeholder={"One thing I'm grateful you exist for is…"}
              rows={5}
              className="mt-5 w-full rounded-2xl border border-border bg-card px-4 py-4 text-[16px] leading-[1.55] text-ink placeholder:text-ink-mute outline-none focus:border-rust serif-italic"
            />
            <p className="mt-1 text-right text-[11px] text-ink-mute">{letter.length}/280</p>

            <div className="flex gap-2 mt-2">
              <button onClick={back} disabled={finalize.isPending}
                      className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-sm text-ink disabled:opacity-60">Back</button>
              <button
                onClick={() => { if (!finalize.isPending) finalize.mutate(); }}
                disabled={finalize.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-60"
              >
                {finalize.isPending ? "Sealing…" : (isJoiningPartner ? "Send" : "Reveal")} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </StepBlock>
        )}

        {step === 6 && inviteCode && !isJoiningPartner && (
          <StepBlock eyebrow={EYEBROWS[6]} title={<><em className="serif-italic text-rust">A small archive of you two.</em></>}>
            <div className="mt-5 surface-card p-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Your bond</p>
              <p className="mt-2 font-serif text-2xl text-ink leading-tight">{name} &amp; <span className="serif-italic text-rust">your partner</span></p>
              {anniversary && <p className="mt-1 text-sm text-ink-soft">Since {new Date(anniversary).toLocaleDateString(undefined, { year: "numeric", month: "long" })}</p>}
              <p className="mt-1 text-sm text-ink-soft capitalize">{stage.replace("_"," ")}</p>

              {letter && (
                <blockquote className="mt-5 border-l-2 border-rust pl-4 serif-italic text-ink text-base leading-relaxed">
                  "{letter}"
                </blockquote>
              )}

              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Invite code · expires in 14 days</p>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(inviteCode);
                    toast.success("Code copied. Send it to your partner.");
                  }}
                  className="mt-2 w-full inline-flex items-center justify-between rounded-2xl bg-canvas-deep px-5 py-4"
                >
                  <span className="font-serif text-3xl tracking-[0.3em] text-ink">{inviteCode}</span>
                  <Copy className="h-4 w-4 text-ink-mute" />
                </button>
              </div>
            </div>

            <button
              onClick={() => navigate({ to: "/home" })}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3.5 text-sm font-medium text-canvas hover:opacity-90"
            >
              Enter Our Journey <ArrowRight className="h-4 w-4" />
            </button>
          </StepBlock>
        )}
      </div>

      {step > 0 && step < 5 && (
        <button onClick={back} className="mt-4 text-sm text-ink-mute hover:text-ink">← Back</button>
      )}
    </main>
  );
}

function StepBlock({ eyebrow, title, children }: { eyebrow: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-ink-mute">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-3xl text-ink leading-tight text-balance">{title}</h1>
      {children}
    </div>
  );
}

function Continue({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3.5 text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-50"
    >
      Continue <ArrowRight className="h-4 w-4" />
    </button>
  );
}
