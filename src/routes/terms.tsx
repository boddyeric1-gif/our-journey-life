import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — Our Journey" },
      {
        name: "description",
        content:
          "The short version of using Our Journey. Be kind to your partner, write only what you'd want to read, and we'll do our part to keep the space safe.",
      },
      { property: "og:title", content: "Terms — Our Journey" },
      { property: "og:description", content: "The short version of using Our Journey." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="relative z-10 min-h-[100svh]">
      <header className="px-6 pt-8">
        <Link to="/" className="serif-italic text-rust text-xl">
          Our Journey
        </Link>
      </header>
      <article className="px-6 pt-10 pb-20 max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-mute">Terms</p>
        <h1 className="mt-4 font-serif text-4xl text-ink leading-tight">A short agreement.</h1>
        <p className="mt-6 text-ink-soft text-lg leading-relaxed">
          By using Our Journey you agree to a few simple things. We've kept the list
          short because most of it is what you'd want either way.
        </p>

        <Section title="Be kind to your partner">
          Our Journey is built for tenderness. Don't use it for harm. We reserve
          the right to suspend accounts that use the product to harass or coerce
          another person.
        </Section>

        <Section title="Your writing belongs to you">
          You own everything you write here. We only hold the right to display it
          back to you and your partner inside the app. Delete your account and we
          delete the rows.
        </Section>

        <Section title="No warranty, no liability">
          The app is provided as-is. We do our best but we can't promise it will
          never have bugs, downtime, or the occasional rough edge.
        </Section>

        <Section title="Changes">
          If we ever materially change these terms, we'll tell you in-app first.
          Continued use after that counts as acceptance.
        </Section>

        <Section title="Reach us">
          Anything you want to know:{" "}
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
