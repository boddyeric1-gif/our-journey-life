import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { acceptInvite, lookupInvite } from "@/lib/couple.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

const PENDING_INVITE_KEY = "rq_pending_invite";

export const Route = createFileRoute("/join/$code")({
  head: () => ({
    meta: [
      { title: "Your partner invited you — Our Journey" },
      { name: "description", content: "You've been invited to a private couple space on Our Journey. Accept to begin." },
      { property: "og:title", content: "Your partner invited you — Our Journey" },
      { property: "og:description", content: "A quiet place for the two of you. Daily rituals, argument aftercare, and letters that wait." },
      { property: "og:image", content: "https://our-journey.life/og-cover.jpg" },
      { name: "twitter:image", content: "https://our-journey.life/og-cover.jpg" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lookup = useServerFn(lookupInvite);
  const accept = useServerFn(acceptInvite);

  const [state, setState] = useState<"loading" | "auth" | "preview" | "error">("loading");
  const [error, setError] = useState("");
  const [data, setData] = useState<Awaited<ReturnType<typeof lookup>> | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        if (typeof window !== "undefined") window.localStorage.setItem(PENDING_INVITE_KEY, code);
        navigate({ to: "/auth", search: { mode: "signup", join: code } });
        return;
      }
      try {
        const r = await lookup({ data: { code } });
        if (!r.ok) {
          setError(r.reason === "expired" ? "This invite has expired." : r.reason === "used" ? "This invite has already been used." : "Invite not found.");
          setState("error");
          return;
        }
        if (r.alreadyPairedElsewhere) {
          setError("You're already paired with someone. Leave your current couple first to join another.");
          setState("error");
          return;
        }
        setData(r);
        setState("preview");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Couldn't load invite");
        setState("error");
      }
    })();
  }, [code, navigate, lookup]);

  const accepting = useMutation({
    mutationFn: () => accept({ data: { code } }),
    onSuccess: () => {
      if (typeof window !== "undefined") window.localStorage.removeItem(PENDING_INVITE_KEY);
      qc.invalidateQueries();
      toast.success("You're paired. Welcome.");
      navigate({ to: "/onboarding" });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't accept"),
  });

  if (state === "loading") return <Centered>Loading…</Centered>;
  if (state === "error") return (
    <Centered>
      <p className="serif-italic text-rust">Sorry</p>
      <h1 className="mt-2 font-serif text-2xl text-ink">{error}</h1>
    </Centered>
  );
  if (!data || !data.ok) return null;

  return (
    <main className="relative z-10 min-h-[100svh] max-w-md mx-auto px-6 py-12">
      <p className="serif-italic text-rust text-lg">Our Journey</p>
      <p className="mt-8 text-[11px] uppercase tracking-[0.2em] text-ink-mute">A private invitation</p>
      <h1 className="mt-2 font-serif text-3xl text-ink leading-tight">
        <em className="serif-italic text-rust">{data.inviterName}</em> is waiting for you.
      </h1>
      <p className="mt-3 text-ink-soft text-sm leading-relaxed">
        A quiet space for the two of you — daily prompts, argument aftercare, and letters that wait.
      </p>

      <article className="mt-6 surface-card p-6">
        {data.firstLetter ? (
          <blockquote className="serif-italic text-ink text-lg leading-relaxed border-l-2 border-rust pl-4">
            "{data.firstLetter}"
          </blockquote>
        ) : (
          <p className="text-ink-soft serif-italic">No letter yet. They're keeping the first words for you.</p>
        )}
        <p className="mt-6 text-[11px] uppercase tracking-[0.16em] text-ink-mute">From</p>
        <p className="font-serif text-lg text-ink mt-1">{data.inviterName}</p>
      </article>

      <button
        onClick={() => accepting.mutate()}
        disabled={accepting.isPending}
        className="mt-8 w-full btn-primary disabled:opacity-60"
      >
        {accepting.isPending ? "Accepting…" : "Accept and begin together"} <ArrowRight className="h-4 w-4" />
      </button>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100svh] flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto">
      {children}
    </main>
  );
}
