import { createFileRoute, Link } from "@tanstack/react-router";

const TITLE = "Would You Rather Questions for Couples — A Low-Pressure Ritual";
const DESCRIPTION =
  "A curated list of would you rather questions for couples — fun, deep, and relationship-focused — designed as a low-pressure ritual for getting to know each other again.";
const URL = "https://our-journey.life/resources/would-you-rather";

export const Route = createFileRoute("/resources/would-you-rather")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "would you rather questions for couples, would you rather couples, fun questions for couples, deep questions for couples, relationship questions",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          url: URL,
          inLanguage: "en",
          author: { "@type": "Organization", name: "Our Journey" },
          publisher: { "@type": "Organization", name: "Our Journey" },
          mainEntityOfPage: URL,
        }),
      },
    ],
  }),
  component: WouldYouRatherPage,
});

type Section = {
  id: string;
  title: string;
  intro: string;
  questions: string[];
};

const SECTIONS: Section[] = [
  {
    id: "fun",
    title: "Fun — the easy ones",
    intro:
      "Start here. The point is to laugh, not to score. These are quick to answer and tell you more about each other than the answer itself does.",
    questions: [
      "Would you rather have an unlimited international flight pass or never have to pay for food at restaurants again?",
      "Would you rather always be slightly underdressed or slightly overdressed?",
      "Would you rather have a personal chef or a personal driver?",
      "Would you rather only ever listen to one album for the rest of your life, or only ever watch one movie?",
      "Would you rather live by the ocean or in the mountains?",
      "Would you rather have a quiet weekend at home or a spontaneous trip somewhere new?",
      "Would you rather give up coffee or give up dessert?",
      "Would you rather be famous for something you didn't do, or anonymously do something amazing?",
      "Would you rather host the holidays every year, or travel for them every year?",
      "Would you rather never check your phone again, or never check email again?",
    ],
  },
  {
    id: "deep",
    title: "Deep — the slower ones",
    intro:
      "These take a little longer. Ask one, let the answer land, and then talk about why. The 'why' is the part that matters.",
    questions: [
      "Would you rather know exactly when you'll die or exactly how?",
      "Would you rather be deeply loved by a few or admired by many?",
      "Would you rather forget every painful memory you have, or keep all of them as they are?",
      "Would you rather be brilliant at something you don't enjoy, or mediocre at something you love?",
      "Would you rather always know what others think of you, or never know at all?",
      "Would you rather have more time or more money?",
      "Would you rather be remembered for your work or for who you were to people?",
      "Would you rather live the same good year on repeat, or live a series of imperfect, different ones?",
      "Would you rather feel certain and sometimes wrong, or uncertain and often right?",
      "Would you rather inherit your parents' best trait or be free of their worst one?",
    ],
  },
  {
    id: "relationship",
    title: "For the two of you",
    intro:
      "These are about the relationship itself. Take them gently — they're better answered honestly than quickly.",
    questions: [
      "Would you rather spend a whole day apart and reunite at dinner, or be together the whole day with no plan?",
      "Would you rather we talk through a hard thing tonight or write each other letters about it?",
      "Would you rather have a standing weekly date or a surprise date once a month?",
      "Would you rather I tell you when something's wrong right away, or wait until I've thought it through?",
      "Would you rather go to bed early together or stay up late together?",
      "Would you rather we save aggressively for a big shared thing, or spend a little more on small shared things?",
      "Would you rather hear the same thing you love about me said often, or hear a new thing rarely?",
      "Would you rather we make all big decisions slowly together, or split them by who cares more?",
      "Would you rather a quiet anniversary at home or a trip neither of us has taken?",
      "Would you rather I always ask before helping, or always help without asking?",
    ],
  },
];

function WouldYouRatherPage() {
  return (
    <main className="relative z-10 min-h-[100svh]">
      <header className="px-6 pt-8">
        <Link to="/" className="serif-italic text-rust text-xl">
          Our Journey
        </Link>
      </header>

      <article className="px-6 pt-10 pb-20 max-w-2xl mx-auto prose-content">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-mute">
          A guide
        </p>
        <h1 className="mt-4 font-serif text-4xl text-ink leading-tight">
          Would you rather questions for couples
        </h1>
        <p className="mt-6 text-ink-soft text-lg leading-relaxed">
          Would you rather is a small, low-pressure ritual. You don't have to
          be in the right mood for it. You don't have to set aside an evening.
          You can ask one in the car, between cooking and eating, in the
          minute before sleep — and learn something about the person next to
          you that you wouldn't have known to ask about directly.
        </p>
        <p className="mt-4 text-ink-soft leading-relaxed">
          The list below is organized into three kinds: fun ones to warm up
          with, deeper ones for slower evenings, and a set written for the two
          of you specifically. Skip around. Save some for later. The point is
          the conversation each question opens, not the answer.
        </p>

        <nav aria-label="Contents" className="mt-10">
          <h2 className="text-xs uppercase tracking-[0.18em] text-ink-mute">
            Inside this guide
          </h2>
          <ul className="mt-3 space-y-1.5 text-ink-soft">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-rust underline-offset-4 hover:underline"
                >
                  {s.title}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#how-to-use"
                className="text-rust underline-offset-4 hover:underline"
              >
                How to use them
              </a>
            </li>
          </ul>
        </nav>

        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="mt-12 scroll-mt-20">
            <h2 className="font-serif text-2xl text-ink">{s.title}</h2>
            <p className="mt-2 text-ink-soft leading-relaxed">{s.intro}</p>
            <ol className="mt-5 space-y-3 list-decimal pl-5 marker:text-ink-mute">
              {s.questions.map((q) => (
                <li key={q} className="text-ink-soft leading-relaxed">
                  {q}
                </li>
              ))}
            </ol>
          </section>
        ))}

        <section id="how-to-use" className="mt-14 scroll-mt-20">
          <h2 className="font-serif text-2xl text-ink">How to use them</h2>
          <ul className="mt-5 space-y-3 text-ink-soft leading-relaxed list-disc pl-5 marker:text-ink-mute">
            <li>
              <strong className="text-ink">One at a time.</strong>{" "}
              A would you rather isn't a quiz. Ask one, let it sit, talk about
              why before moving on.
            </li>
            <li>
              <strong className="text-ink">Take the answer seriously.</strong>{" "}
              Even the silly ones reveal something — a preference, a fear, a
              small piece of how someone sees the world.
            </li>
            <li>
              <strong className="text-ink">No third option.</strong>{" "}
              The constraint is the point. "I don't know, both?" is a kind of
              not-answering.
            </li>
            <li>
              <strong className="text-ink">Both of you answer.</strong>{" "}
              The asker doesn't get to opt out. Reciprocity is what turns the
              question into a conversation.
            </li>
          </ul>
        </section>

        <section className="mt-14 rounded-2xl border border-ink/10 bg-paper-warm/40 p-6">
          <h2 className="font-serif text-2xl text-ink">
            One question a night, written for the two of you
          </h2>
          <p className="mt-3 text-ink-soft leading-relaxed">
            Our Journey sends one quiet question to both of you each evening.
            You each answer privately; once you've both written, the answers
            open. A would you rather is the warm-up — this is the ritual.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center rounded-full bg-rust px-5 py-2.5 text-paper text-sm font-medium hover:opacity-90 transition"
            >
              Start tonight
            </Link>
            <Link
              to="/resources/36-questions"
              className="inline-flex items-center rounded-full border border-ink/15 px-5 py-2.5 text-ink text-sm hover:bg-ink/5 transition"
            >
              The 36 questions guide
            </Link>
          </div>
        </section>

        <p className="mt-12 text-xs text-ink-mute">
          Written by the Our Journey team. Last updated June 25, 2026.
        </p>
      </article>
    </main>
  );
}
