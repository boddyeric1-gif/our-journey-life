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
            className="mt-5 w-full inline-flex items-center justify-between rounded-2xl bg-canvas-deep px-5 py-4 hover:bg-canvas-deep/80 transition"
          >
            <span className="text-[11px] uppercase tracking-[0.2em] text-ink-mute">Invite code</span>
            <span className="font-serif text-3xl tracking-[0.3em] text-ink">{props.inviteCode}</span>
            <Copy className="h-4 w-4 text-ink-mute" />
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
              className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-canvas hover:opacity-90"
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
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3.5 text-sm font-medium text-canvas hover:opacity-90"
        >
          Write your answer <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-3 text-center text-xs text-ink-mute">+50 XP · advances your streak</p>
      </HeroFrame>
    );
  }

  if (props.state === "mine-done-partner-waiting") {
    const sealedBoth = !!props.partnerSubmitted;
    return (
      <HeroFrame eyebrow={dayEyebrow(props.daysTogether, "Sealed for tonight")} tone="quiet">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">
          {sealedBoth
            ? `You both sealed it · refresh to reveal`
            : `Waiting on ${props.partnerName ?? "your partner"}`}
        </p>
        <h2 className="mt-2 font-serif text-2xl text-ink leading-snug text-balance">
          {sealedBoth
            ? "You both arrived. Open today together."
            : "Your answer is sealed. Theirs will open it."}
        </h2>
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/60 px-4 py-5 text-center">
          <Lock className="h-5 w-5 text-ink-mute mx-auto" />
          <p className="mt-2 serif-italic text-rust text-sm">
            {sealedBoth ? "two seals, ready to break" : "until you both arrive"}
          </p>
        </div>
        <Link
          to="/daily"
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-canvas hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" /> {sealedBoth ? "Open today" : "Write a solo reflection"}
        </Link>
        {!sealedBoth && (
          <p className="mt-2 text-center text-xs text-ink-mute">+30 XP · keeps your streak alive</p>
        )}
      </HeroFrame>
    );
  }

  if (props.state === "both-done") {
    return (
      <HeroFrame eyebrow={dayEyebrow(props.daysTogether, "Today · Revealed")} tone="rust">
        <Heart className="h-5 w-5 text-rust" />
        <h2 className="mt-2 font-serif text-2xl text-ink leading-snug text-balance">
          You both answered today.
        </h2>
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
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-canvas-deep px-5 py-3 text-sm font-medium text-ink hover:bg-canvas-deep/80"
        >
          Read together <ArrowRight className="h-4 w-4" />
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
        className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-canvas hover:opacity-90"
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
    <section className="mx-5 surface-card p-6 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 ${tone === "rust" ? "bg-rust/80" : "bg-clay/60"}`} />
      <p className="text-[11px] uppercase tracking-[0.2em] text-ink-mute mb-3">{eyebrow}</p>
      {children}
    </section>
  );
}
