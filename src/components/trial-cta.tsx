import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Clock, Sparkles } from "lucide-react";
import { startFeatureTrial, type TrialSnapshot } from "@/lib/trial.functions";

type Product = "the_atlas" | "time_capsule";

const LABELS: Record<Product, string> = {
  the_atlas: "the Atlas",
  time_capsule: "the Time Capsule",
};

export function TrialCta({
  product,
  eligible,
  mine,
  hasCouple,
}: {
  product: Product;
  eligible: boolean;
  mine: TrialSnapshot;
  hasCouple: boolean;
}) {
  const qc = useQueryClient();
  const start = useServerFn(startFeatureTrial);
  const mut = useMutation({
    mutationFn: () => start({ data: { product } }),
    onSuccess: () => {
      toast.success(`Your 7-day trial is on. Both of you have full access.`);
      qc.invalidateQueries({ queryKey: ["entitlements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (mine.used && !mine.active) {
    return (
      <p className="mt-4 text-xs text-ink-mute italic">
        Your free trial has ended. One subscription covers both of you.
      </p>
    );
  }
  if (!eligible) return null;

  return (
    <div className="mt-4 surface-card-quiet p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-rust inline-flex items-center gap-1.5">
        <Sparkles className="h-3 w-3" /> Try it free
      </p>
      <p className="mt-2 text-sm text-ink-soft leading-relaxed">
        Seven days, no card needed. One trial unlocks full access for both of you.
      </p>
      <button
        onClick={() => mut.mutate()}
        disabled={!hasCouple || mut.isPending}
        className="btn-primary mt-3 w-full text-sm disabled:opacity-40"
      >
        {mut.isPending ? "Starting…" : "Start 7-day couple trial"}
      </button>
      {!hasCouple && (
        <p className="mt-2 text-[11px] text-ink-mute">
          Pair with your partner to activate the trial for both of you.
        </p>
      )}
    </div>
  );
}

export function TrialBanner({
  product,
  coupleActive,
  mine,
}: {
  product: Product;
  coupleActive: boolean;
  mine: TrialSnapshot;
}) {
  if (!coupleActive) return null;
  const showing = mine.active ? mine : null;
  const daysLeft = showing?.daysLeft ?? null;

  return (
    <div className="mx-5 mt-4 rounded-2xl border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-ink-soft inline-flex items-start gap-2">
      <Clock className="h-4 w-4 text-rust shrink-0 mt-0.5" />
      <div className="flex-1">
        {showing ? (
          <>
            <span className="text-ink">Couple trial · {LABELS[product]}</span>{" "}
            <span className="text-ink-mute">
              — {daysLeft} day{daysLeft === 1 ? "" : "s"} left for both of you.
            </span>
          </>
        ) : (
          <span className="text-ink">
            You're on your partner's couple trial for {LABELS[product]}.
          </span>
        )}
      </div>
    </div>
  );
}
