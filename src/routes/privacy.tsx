import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Our Journey" },
      {
        name: "description",
        content:
          "How Our Journey handles your data. We hold the bare minimum, treat your writing as private to your couple, and never sell or share it.",
      },
      { property: "og:title", content: "Privacy — Our Journey" },
      { property: "og:description", content: "How we hold your data with care." },
      { property: "og:url", content: "https://our-journey.life/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://our-journey.life/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="relative z-10 min-h-[100svh]">
      <header className="px-6 pt-8">
        <Link to="/" className="serif-italic text-rust text-xl">
          Our Journey
        </Link>
      </header>
      <article className="px-6 pt-10 pb-20 max-w-2xl mx-auto prose-content">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-mute">Privacy</p>
        <h1 className="mt-4 font-serif text-4xl text-ink leading-tight">
          A short, plain promise.
        </h1>
        <p className="mt-6 text-ink-soft text-lg leading-relaxed">
          Our Journey is a private space for two people. We hold the bare minimum
          to make that work and we treat what you write as yours.
        </p>

        <Section title="What we store">
          Your email and an optional display name, the writing you create
          (daily answers, letters, quest reflections), and small counters that
          power streaks and progress. Nothing else.
        </Section>

        <Section title="Who can read it">
          You and your partner — and only after you've both written your daily
          answer do either of you see the other's. We've enforced this at the
          database level, not just in the app.
        </Section>

        <Section title="What we never do">
          We don't sell your data. We don't share it with advertisers. We don't
          train models on your writing. We don't run analytics services that
          identify you personally.
        </Section>

        <Section title="What you can do">
          Export everything at any time. Delete your account and we delete the
          rows. Unpair from your partner without losing your own history.
        </Section>

        <Section title="Where it lives">
          On managed infrastructure with row-level security. Encrypted at rest
          and in transit. Backups follow the same rules.
        </Section>

        <Section title="Contact">
          Questions or requests:{" "}
          <a className="text-rust underline-offset-4 hover:underline" href="mailto:hello@ourjourney.app">
            hello@ourjourney.app
          </a>
          .
        </Section>

        <p className="mt-12 text-xs text-ink-mute">Last updated: June 19, 2026.</p>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl text-ink">{title}</h2>
      <p className="mt-3 text-ink-soft leading-relaxed">{children}</p>
    </section>
  );
}
