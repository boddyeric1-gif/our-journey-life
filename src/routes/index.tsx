import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Our Journey — daily rituals for closer love" },
      { name: "description", content: "A quiet quest log for couples. Daily prompts, gentle quests, and the small rituals that keep love alive — meaningful even when only one of you opens it." },
      { property: "og:title", content: "Our Journey — daily rituals for closer love" },
      { property: "og:description", content: "Daily prompts, gentle quests, and the small rituals that keep love alive. Built for two." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ourjourney.app/" },
    ],
    links: [{ rel: "canonical", href: "https://ourjourney.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Our Journey",
          url: "https://ourjourney.app/",
          description: "Daily rituals, prompts, and gentle quests for couples.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Our Journey",
          url: "https://ourjourney.app/",
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  // If signed in, fast-forward to home — but always render the landing
  // immediately so the page is never stuck on a loading screen.
  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        if (data.session?.user) window.location.replace("/home");
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="relative z-10 min-h-[100svh] flex flex-col">
      <header className="px-6 pt-8 flex items-center justify-between">
        <p className="serif-italic text-rust text-xl">Our Journey</p>
        <Link to="/auth" className="text-sm text-ink-soft hover:text-ink underline-offset-4 hover:underline">
          Sign in
        </Link>
      </header>

      <section className="flex-1 px-6 pt-12 pb-16 max-w-xl mx-auto w-full">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-mute">Volume One · For couples</p>
        <h1 className="mt-5 font-serif text-[44px] leading-[1.05] text-ink text-balance">
          A quieter way <em className="serif-italic text-rust">to grow</em> closer.
        </h1>
        <p className="mt-5 text-ink-soft text-lg leading-relaxed text-pretty">
          Daily prompts, gentle quests, and the small rituals that make love feel
          tended-to. Built for two — meaningful even when only one of you opens it.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center justify-center rounded-full bg-ink px-6 py-4 text-base font-medium text-canvas hover:opacity-90 transition"
          >
            Begin your quest
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center text-sm text-ink-soft hover:text-ink"
          >
            I already have an account
          </Link>
        </div>

        <h2 className="sr-only">Features</h2>
        <div className="mt-16 grid gap-4">
          <FeatureRow num="01" title="A daily Spark">
            One prompt a day. Both write. Both reveal together.
          </FeatureRow>
          <FeatureRow num="02" title="Quests, not quizzes">
            Multi-day chapters on listening, trust, and repair.
          </FeatureRow>
          <FeatureRow num="03" title="Meaningful alone, too">
            Solo reflections, private letters, and insights when your partner is offline.
          </FeatureRow>
        </div>
      </section>

      <footer className="px-6 pb-10 text-xs text-ink-mute text-center">
        Made with care by Eric Boddy for iOS &amp; Android
      </footer>
    </main>
  );
}

function FeatureRow({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card-quiet p-5 flex gap-4">
      <span className="serif-italic text-rust text-xl leading-none mt-1">{num}</span>
      <div>
        <h3 className="font-serif text-lg text-ink">{title}</h3>
        <p className="mt-1 text-sm text-ink-soft">{children}</p>
      </div>
    </div>
  );
}
