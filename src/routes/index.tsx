import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Our Journey — daily rituals for closer love" },
      { name: "description", content: "A quiet quest log for couples. Daily prompts, gentle quests, and the small rituals that keep love alive — meaningful even when only one of you opens it." },
      { property: "og:title", content: "Our Journey — daily rituals for closer love" },
      { property: "og:description", content: "A quiet quest log for couples. Daily prompts, gentle quests, and the small rituals that keep love alive — meaningful even when only one of you opens it." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://our-journey.life/" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/7834a996-3245-4d23-b9ec-2b733934de09" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/7834a996-3245-4d23-b9ec-2b733934de09" },
    ],
    links: [{ rel: "canonical", href: "https://our-journey.life/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Our Journey",
          url: "https://our-journey.life/",
          description: "Daily rituals, prompts, and gentle quests for couples.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Our Journey",
          url: "https://our-journey.life/",
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
    <main className="relative z-10 min-h-[100svh] flex flex-col overflow-hidden">
      {/* Ambient hero glow — layered behind everything. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, oklch(0.71 0.075 32 / 0.35), transparent 70%)" }}
      />
      <header className="relative px-6 pt-8 flex items-center justify-between">
        <p className="serif-italic text-rust text-xl tracking-tight">Our Journey</p>
        <Link to="/auth" className="tap text-sm text-ink-soft hover:text-ink underline-offset-4 hover:underline">
          Sign in
        </Link>
      </header>

      <section className="relative flex-1 px-6 pt-14 pb-16 max-w-xl mx-auto w-full">
        <p className="text-xs uppercase tracking-[0.22em] text-ink-mute animate-rise">Volume One · For couples</p>
        <h1 className="mt-5 font-serif text-[46px] sm:text-[54px] leading-[1.03] text-ink text-balance animate-rise" style={{ animationDelay: "80ms" }}>
          A quieter way <em className="serif-italic text-rose-gradient">to grow</em> closer.
        </h1>
        <p className="mt-6 text-ink-soft text-lg leading-relaxed text-pretty animate-rise" style={{ animationDelay: "160ms" }}>
          Daily prompts, gentle quests, and the small rituals that make love feel
          tended-to. Built for two — meaningful even when only one of you opens it.
        </p>

        <div className="mt-10 flex flex-col gap-3 animate-rise" style={{ animationDelay: "240ms" }}>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="btn-primary tap"
          >
            Begin your quest
          </Link>
          <Link
            to="/auth"
            className="tap inline-flex items-center justify-center text-sm text-ink-soft hover:text-ink"
          >
            I already have an account
          </Link>
        </div>

        <div className="mt-14 divider-ornate">
          <span className="serif-italic text-sm">three small rituals</span>
        </div>

        <h2 className="sr-only">Features</h2>
        <div className="mt-8 grid gap-4">
          <FeatureRow num="01" title="A daily Spark">
            One prompt a day. Both write. Both reveal together.
          </FeatureRow>
          <FeatureRow num="02" title="Quests, not quizzes">
            Multi-day chapters on listening, trust, and repair.
          </FeatureRow>
          <FeatureRow num="03" title="Meaningful alone, too">
            Solo reflections and private letters when your partner is offline.
          </FeatureRow>
        </div>
      </section>

      <footer className="relative px-6 pb-10 text-xs text-ink-mute text-center">
        Made with care by Eric Boddy for iOS &amp; Android
      </footer>
    </main>
  );
}

function FeatureRow({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-5 flex gap-4 hover:bg-card/80 transition tap">
      <span className="serif-italic text-rose-gradient text-2xl leading-none mt-1 shrink-0">{num}</span>
      <div className="min-w-0">
        <h3 className="font-serif text-lg text-ink">{title}</h3>
        <p className="mt-1 text-sm text-ink-soft text-pretty">{children}</p>
      </div>
    </div>
  );
}

