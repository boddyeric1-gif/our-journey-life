import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Copy, Heart, Lock, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  state: "unpaired" | "no-prompt-answered" | "mine-done-partner-waiting" | "both-done" | "all-done";
  prompt?: { body: string; theme: string | null } | null;
  inviteCode?: string;
  partnerName?: string | null;
  daysTogether?: number | null;
  partnerSubmitted?: boolean;
  myPreview?: string | null;
  partnerPreview?: string | null;
  autoUnsealed?: boolean;
};

function dayEyebrow(n?: number | null, fallback = "Today's Spark") {
  if (!n || n < 1) return fallback;
  return `Today · Day ${n} together`;
}

export function TodayHero(props: Props) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  if (props.state === "unpaired") {
    return (
      <HeroFrame eyebrow="Today · First step" tone="rust">
        <h2 className="font-serif text-[28px] leading-tight text-ink text-balance">
          Send your <em className="serif-italic text-rust">invite</em>. Their first screen is a love letter from you.
        </h2>
        <p className="mt-3 text-sm text-ink-soft">
          Share your 6-letter code. When they accept, both of you unlock today's Spark.
        </p>
        {props.inviteCode && (
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(props.inviteCode!);
                toast.success("Code copied. Send it to your partner.");
              } catch { /* ignore */ }
            }}
            aria-label="Copy invite code"
            className="mt-5 w-full inline-flex items-center justify-between gap-3 rounded-2xl bg-canvas-deep px-5 py-4 hover:bg-canvas-deep/80 transition"
          >
            <span className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-ink-mute">Invite code</span>
            <span className="min-w-0 font-serif text-2xl sm:text-3xl tracking-[0.18em] sm:tracking-[0.3em] text-ink truncate">{props.inviteCode}</span>
            <Copy className="h-4 w-4 text-ink-mute shrink-0" aria-hidden />
          </button>
        )}

        <div className="mt-6 pt-5 border-t border-border">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Or — they sent you one</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const c = code.trim().toUpperCase();
              if (c.length < 4) { toast.error("Enter a valid code."); return; }
              navigate({ to: "/join/$code", params: { code: c } });
            }}
            className="mt-2 flex gap-2"
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={12}
              className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-base text-ink placeholder:text-ink-mute outline-none focus:border-rust tracking-[0.2em] font-serif"
            />
            <button
              type="submit"
              className="btn-primary"
            >
              Redeem
            </button>

          </form>
        </div>
      </HeroFrame>
    );
  }

  if (props.state === "no-prompt-answered") {
    return (
      <HeroFrame eyebrow={dayEyebrow(props.daysTogether)} tone="rust">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">{props.prompt?.theme ?? "a small prompt"}</p>
        <p className="mt-3 serif-italic text-rust text-lg">"</p>
        <h2 className="-mt-3 font-serif text-[26px] leading-snug text-ink text-balance">
          {props.prompt?.body}
        </h2>
        {props.partnerSubmitted && (
          <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-ink-mute">
            {props.partnerName ?? "Your partner"} already sealed theirs · your turn
          </p>
        )}
        <Link
          to="/daily"
          className="btn-primary mt-6 w-full"
        >
          Write your answer <ArrowRight className="h-4 w-4" />
        </Link>
      </HeroFrame>
    );
  }

  if (props.state === "mine-done-partner-waiting") {
    const sealedBoth = !!props.partnerSubmitted;
    return (
      <HeroFrame eyebrow={dayEyebrow(props.daysTogether, "Sealed for tonight")} tone="quiet">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">
          {sealedBoth
            ? `You both sealed it`
            : `Waiting on ${props.partnerName ?? "your partner"}`}
        </p>
        <h2 className="mt-2 font-serif text-2xl text-ink leading-snug text-balance">
          {sealedBoth
            ? "You both arrived. Open today together."
            : "Your answer is sealed. Theirs will open it."}
        </h2>
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/60 px-4 py-5 text-center">
          <Lock className="h-5 w-5 text-ink-mute mx-auto" aria-hidden />
          <p className="mt-2 serif-italic text-rust text-sm">
            {sealedBoth ? "two seals, ready to break" : "until you both arrive"}
          </p>
        </div>
        <Link
          to="/daily"
          className="btn-primary mt-5 w-full"

        >
          <Sparkles className="h-4 w-4" aria-hidden /> {sealedBoth ? "Open today" : "Write a solo reflection"}
        </Link>
      </HeroFrame>
    );
  }

  if (props.state === "both-done") {
    const auto = !!props.autoUnsealed;
    return (
      <HeroFrame eyebrow={dayEyebrow(props.daysTogether, auto ? "Today · Auto-opened" : "Today · Revealed")} tone="rust">
        <Heart className="h-5 w-5 text-rust" />
        <h2 className="mt-2 font-serif text-2xl text-ink leading-snug text-balance">
          {auto ? "Opened on your own." : "You both answered today."}
        </h2>
        {auto && (
          <p className="mt-2 text-[12px] text-ink-soft">
            {props.partnerName ?? "Your partner"} didn't get to this one. You can still keep going.
          </p>
        )}
        {(props.myPreview || props.partnerPreview) && (
          <div className="mt-4 grid gap-3">
            {props.myPreview && (
              <div className="rounded-2xl bg-canvas-deep/60 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-ink-mute">You</p>
                <p className="mt-0.5 text-sm text-ink-soft serif-italic line-clamp-2">"{props.myPreview}"</p>
              </div>
            )}
            {props.partnerPreview && (
              <div className="rounded-2xl bg-canvas-deep/60 px-4 py-3 border-l-2 border-rust">
                <p className="text-[10px] uppercase tracking-[0.16em] text-ink-mute">{props.partnerName ?? "Them"}</p>
                <p className="mt-0.5 text-sm text-ink-soft serif-italic line-clamp-2">"{props.partnerPreview}"</p>
              </div>
            )}
          </div>
        )}
        <Link
          to="/daily"
          className="btn-ghost mt-5 w-full"
        >
          {auto ? "Open today" : "Read together"} <ArrowRight className="h-4 w-4" />
        </Link>
      </HeroFrame>
    );
  }

  return (
    <HeroFrame eyebrow={dayEyebrow(props.daysTogether, "Today · Complete")} tone="quiet">
      <h2 className="font-serif text-2xl text-ink leading-snug text-balance">
        You've done today's work. Rest is also a ritual.
      </h2>
      <Link
        to="/quests"
        className="btn-primary mt-5 w-full"
      >
        Continue a quest <ArrowRight className="h-4 w-4" />
      </Link>
    </HeroFrame>
  );
}

function HeroFrame({
  eyebrow, tone, children,
}: { eyebrow: string; tone: "rust" | "quiet"; children: React.ReactNode }) {
  return (
    <section
      className={`mx-5 ${tone === "rust" ? "surface-card-lifted seal-top" : "surface-card"} p-6 relative`}
    >
      <p className="t-eyebrow mb-3">{eyebrow}</p>
      {children}
    </section>
  );
}

