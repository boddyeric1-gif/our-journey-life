import { createFileRoute, Link } from "@tanstack/react-router";

const TITLE = "Never Have I Ever Questions for Couples — A Playful Ritual";
const DESCRIPTION =
  "A curated set of never have I ever questions for couples — light, honest, and quietly revealing. A playful ritual for learning something new about the person next to you.";
const URL = "https://our-journey.life/resources/never-have-i-ever";

export const Route = createFileRoute("/resources/never-have-i-ever")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "never have i ever questions for couples, never have i ever couples, couples games, relationship questions, fun questions for couples",
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
  component: NeverHaveIEverPage,
});

type Section = {
  id: string;
  title: string;
  intro: string;
  questions: string[];
};

const SECTIONS: Section[] = [
  {
    id: "light",
    title: "Light & fun — the warm-up",
    intro:
      "Start with the small stuff. These are the ones that get a laugh and set the tone. Nobody has to defend an answer.",
    questions: [
      "Never have I ever fallen asleep in a movie theater.",
      "Never have I ever pretended to have read a book I hadn't.",
      "Never have I ever sung karaoke sober.",
      "Never have I ever eaten breakfast for dinner two nights in a row.",
      "Never have I ever gotten lost in my own neighborhood.",
      "Never have I ever texted the wrong person something embarrassing.",
      "Never have I ever ordered dessert first.",
      "Never have I ever ghosted a group chat.",
      "Never have I ever cried at a commercial.",
      "Never have I ever forgotten someone's name mid-introduction.",
    ],
  },
  {
    id: "history",
    title: "Relationship history — the get-to-know-you",
    intro:
      "These are for the story of you, before there was an us. Ask gently; the point isn't a scorecard, it's the small moments you never got around to sharing.",
    questions: [
      "Never have I ever kept a love letter I never sent.",
      "Never have I ever had a crush on a friend's sibling.",
      "Never have I ever been on a blind date.",
      "Never have I ever written a song, poem, or journal entry about someone.",
      "Never have I ever stayed friends with an ex.",
      "Never have I ever changed something about myself for a relationship.",
      "Never have I ever thought I was in love and later realized I wasn't.",
      "Never have I ever kept a small souvenir from a past relationship.",
      "Never have I ever been the one to end things first.",
      "Never have I ever told someone I loved them and regretted it later.",
    ],
  },
  {
    id: "deep",
    title: "Deep & vulnerable — the slow ones",
    intro:
      "Save these for a quiet night. Ask one, let the answer land, and stay in the conversation it opens. Reciprocity matters here — both of you answer.",
    questions: [
      "Never have I ever been afraid to tell you something because of how you might react.",
      "Never have I ever felt lonely in a room full of people.",
      "Never have I ever kept a dream to myself because I thought you'd think it was silly.",
      "Never have I ever wondered what my life would look like if I'd made a different big choice.",
      "Never have I ever felt more like myself with you than with anyone else.",
      "Never have I ever cried in the shower to hide it.",
      "Never have I ever held onto a small resentment longer than I should have.",
      "Never have I ever felt genuinely proud of us.",
      "Never have I ever wanted to say I was sorry and not known how.",
      "Never have I ever loved you more than I let on.",
    ],
  },
];

function NeverHaveIEverPage() {
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
          Never have I ever questions for couples
        </h1>
        <p className="mt-6 text-ink-soft text-lg leading-relaxed">
          Never have I ever is usually a party game. It doesn't have to be.
          Slowed down and asked between two people, it becomes a quiet way to
          learn something you didn't know to ask about — a small memory, an
          old fear, a soft admission you'd never bring up on your own.
        </p>
        <p className="mt-4 text-ink-soft leading-relaxed">
          The list below is organized into three kinds: light ones to warm up
          with, a set for the story of who you each were before, and the
          slower, more vulnerable ones. Skip around. The point is the
          conversation each admission opens, not the tally.
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
              Ask, wait, listen. The answer is the beginning of the
              conversation, not the end of it.
            </li>
            <li>
              <strong className="text-ink">No judgment.</strong>{" "}
              An admission asked for kindly should be received the same way.
              Curiosity, not cross-examination.
            </li>
            <li>
              <strong className="text-ink">Both of you answer.</strong>{" "}
              The asker doesn't get to opt out. Reciprocity is what turns the
              game into a ritual.
            </li>
            <li>
              <strong className="text-ink">Stop when it's enough.</strong>{" "}
              Three good answers you actually talked about are worth more than
              thirty you skimmed.
            </li>
          </ul>
        </section>

        <section className="mt-14 rounded-2xl border border-ink/10 bg-paper-warm/40 p-6">
          <h2 className="font-serif text-2xl text-ink">
            One quiet question a night, for the two of you
          </h2>
          <p className="mt-3 text-ink-soft leading-relaxed">
            Our Journey sends one small prompt to both of you each evening.
            You each answer privately; once you've both written, the answers
            open. Never have I ever is the warm-up — this is the ritual.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center rounded-full bg-rust px-5 py-2.5 text-paper text-sm font-medium hover:opacity-90 transition"
            >
              Start tonight
            </Link>
            <Link
              to="/resources/would-you-rather"
              className="inline-flex items-center rounded-full border border-ink/15 px-5 py-2.5 text-ink text-sm hover:bg-ink/5 transition"
            >
              Would you rather guide
            </Link>
          </div>
        </section>

        <p className="mt-12 text-xs text-ink-mute">
          Written by the Our Journey team. Last updated July 7, 2026.
        </p>
      </article>
    </main>
  );
}
