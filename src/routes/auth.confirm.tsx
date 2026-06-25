import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const PENDING_INVITE_KEY = "rq_pending_invite";

export const Route = createFileRoute("/auth/confirm")({
  head: () => ({
    meta: [
      { title: "Confirming your account — Our Journey" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ConfirmPage,
});

function parseHashError(): { code?: string; description?: string } {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!hash) return {};
  const params = new URLSearchParams(hash);
  const code = params.get("error") ?? params.get("error_code") ?? undefined;
  const description = params.get("error_description") ?? undefined;
  return { code: code || undefined, description: description || undefined };
}

function ConfirmPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<{ code?: string; description?: string } | null>(null);

  useEffect(() => {
    const hashError = parseHashError();
    if (hashError.code || hashError.description) {
      setError(hashError);
      return;
    }

    function go() {
      const pending =
        typeof window !== "undefined"
          ? window.localStorage.getItem(PENDING_INVITE_KEY)
          : null;
      if (pending) navigate({ to: "/join/$code", params: { code: pending } });
      else navigate({ to: "/onboarding" });
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) go();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") go();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (error) {
    const friendly =
      error.description?.toLowerCase().includes("expired") ||
      error.code?.toLowerCase().includes("expired")
        ? "This confirmation link has expired."
        : error.description || "We couldn't confirm your account.";

    return (
      <main className="relative z-10 min-h-[100svh] flex flex-col">
        <header className="px-6 pt-8">
          <Link to="/" className="serif-italic text-rust text-xl">Our Journey</Link>
        </header>
        <section className="flex-1 px-6 pt-16 pb-12 max-w-md mx-auto w-full text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-mute">A small detour</p>
          <h1 className="mt-4 font-serif text-4xl text-ink leading-tight">
            Let's try <em className="serif-italic text-rust">again</em>.
          </h1>
          <p className="mt-5 text-ink-soft leading-relaxed">{friendly}</p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-10 inline-block btn-primary"
          >
            Start over
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="relative z-10 min-h-[100svh] flex flex-col">
      <header className="px-6 pt-8">
        <Link to="/" className="serif-italic text-rust text-xl">Our Journey</Link>
      </header>
      <section className="flex-1 px-6 pt-24 pb-12 max-w-md mx-auto w-full text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-mute">One moment</p>
        <h1 className="mt-4 font-serif text-4xl text-ink leading-tight">
          Setting up your <em className="serif-italic text-rust">account</em>…
        </h1>
        <p className="mt-6 text-ink-soft">This will only take a second.</p>
      </section>
    </main>
  );
}
