import { createFileRoute, Link } from "@tanstack/react-router";

const TITLE = "36 Questions to Fall in Love — A Guide to Arthur Aron's Study";
const DESCRIPTION =
  "The full 36 Questions to Fall in Love from Arthur Aron's study, in their original three sets — with notes on how mutual vulnerability builds closeness.";
const URL = "https://our-journey.life/resources/36-questions";

export const Route = createFileRoute("/resources/36-questions")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "36 questions to fall in love, arthur aron 36 questions, questions to fall in love, intimacy questions for couples, vulnerability questions",
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
  component: ThirtySixQuestionsPage,
});

type Set = {
  id: string;
  title: string;
  intro: string;
  questions: string[];
};

const SETS: Set[] = [
  {
    id: "set-i",
    title: "Set I — Warming up",
    intro:
      "The first twelve questions are light on the surface and heavier underneath. They invite preferences, small wishes, and the first honest sketch of who you are. Take your time; the answers are practice for the sets that follow.",
    questions: [
      "Given the choice of anyone in the world, whom would you want as a dinner guest?",
      "Would you like to be famous? In what way?",
      "Before making a telephone call, do you ever rehearse what you are going to say? Why?",
      "What would constitute a 'perfect' day for you?",
      "When did you last sing to yourself? To someone else?",
      "If you were able to live to the age of 90 and retain either the mind or body of a 30-year-old for the last 60 years of your life, which would you want?",
      "Do you have a secret hunch about how you will die?",
      "Name three things you and your partner appear to have in common.",
      "For what in your life do you feel most grateful?",
      "If you could change anything about the way you were raised, what would it be?",
      "Take four minutes and tell your partner your life story in as much detail as possible.",
      "If you could wake up tomorrow having gained any one quality or ability, what would it be?",
    ],
  },
  {
    id: "set-ii",
    title: "Set II — Going deeper",
    intro:
      "The middle twelve ask you to look at yourself more honestly: memories, regrets, the people who shaped you. This is where mutual vulnerability begins to compound — each answered question makes the next one easier to answer truthfully.",
    questions: [
      "If a crystal ball could tell you the truth about yourself, your life, the future or anything else, what would you want to know?",
      "Is there something that you've dreamed of doing for a long time? Why haven't you done it?",
      "What is the greatest accomplishment of your life?",
      "What do you value most in a friendship?",
      "What is your most treasured memory?",
      "What is your most terrible memory?",
      "If you knew that in one year you would die suddenly, would you change anything about the way you are now living? Why?",
      "What does friendship mean to you?",
      "What roles do love and affection play in your life?",
      "Alternate sharing something you consider a positive characteristic of your partner. Share five items each.",
      "How close and warm is your family? Do you feel your childhood was happier than most other people's?",
      "How do you feel about your relationship with your mother?",
    ],
  },
  {
    id: "set-iii",
    title: "Set III — Tender ground",
    intro:
      "The final twelve are the ones people remember. They ask you to name fears, regrets, and the things you'd want said before it was too late. Speak more slowly here. The point isn't to finish — it's to stay.",
    questions: [
      "Make three true 'we' statements each. For instance, 'We are both in this room feeling…'",
      "Complete this sentence: 'I wish I had someone with whom I could share…'",
      "If you were going to become a close friend with your partner, please share what would be important for them to know.",
      "Tell your partner what you like about them; be very honest this time, saying things that you might not say to someone you've just met.",
      "Share with your partner an embarrassing moment in your life.",
      "When did you last cry in front of another person? By yourself?",
      "Tell your partner something that you like about them already.",
      "What, if anything, is too serious to be joked about?",
      "If you were to die this evening with no opportunity to communicate with anyone, what would you most regret not having told someone? Why haven't you told them yet?",
      "Your house, containing everything you own, catches fire. After saving your loved ones and pets, you have time to safely make a final dash to save any one item. What would it be? Why?",
      "Of all the people in your family, whose death would you find most disturbing? Why?",
      "Share a personal problem and ask your partner's advice on how they might handle it. Also, ask your partner to reflect back to you how you seem to be feeling about the problem you have chosen.",
    ],
  },
];

function ThirtySixQuestionsPage() {
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
          The 36 questions to fall in love
        </h1>
        <p className="mt-6 text-ink-soft text-lg leading-relaxed">
          In 1997, the psychologist Arthur Aron and his colleagues published a
          study that has since taken on a small, persistent life of its own.
          Two strangers sat across from each other and worked through
          thirty-six questions, each more personal than the last. At the end
          they stared into each other's eyes for four silent minutes. The
          paper wasn't really about falling in love. It was about how
          escalating, reciprocal self-disclosure — vulnerability matched by
          vulnerability — can generate closeness more quickly than ordinary
          conversation ever does.
        </p>
        <p className="mt-4 text-ink-soft leading-relaxed">
          The 36 questions to fall in love work because of their structure,
          not their cleverness. Set I is light. Set II goes deeper. Set III
          asks you to say what's usually left unsaid. Used with someone you
          already love, they're less a shortcut to intimacy than a slow,
          deliberate way back to it.
        </p>

        <nav aria-label="Contents" className="mt-10">
          <h2 className="text-xs uppercase tracking-[0.18em] text-ink-mute">
            Inside this guide
          </h2>
          <ul className="mt-3 space-y-1.5 text-ink-soft">
            {SETS.map((s) => (
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
                How to use the questions
              </a>
            </li>
            <li>
              <a
                href="#why-they-work"
                className="text-rust underline-offset-4 hover:underline"
              >
                Why mutual vulnerability works
              </a>
            </li>
          </ul>
        </nav>

        {SETS.map((s) => (
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
          <h2 className="font-serif text-2xl text-ink">
            How to use the questions
          </h2>
          <p className="mt-3 text-ink-soft leading-relaxed">
            The original study gave each pair about forty-five minutes. With
            a partner, that's often too brisk. A few small rules that help:
          </p>
          <ul className="mt-5 space-y-3 text-ink-soft leading-relaxed list-disc pl-5 marker:text-ink-mute">
            <li>
              <strong className="text-ink">Take them in order.</strong>{" "}
              The escalation is the point. Skipping ahead breaks the small
              staircase of trust the early questions build.
            </li>
            <li>
              <strong className="text-ink">Both of you answer each one.</strong>{" "}
              Reciprocity is what does the work. A question only one of you
              answers is an interview, not an exchange.
            </li>
            <li>
              <strong className="text-ink">Don't rush a hard answer.</strong>{" "}
              Sitting with a question for a minute is a kind of honesty too.
            </li>
            <li>
              <strong className="text-ink">Split it across nights.</strong>{" "}
              One set per evening is plenty. Set III, especially, deserves
              its own quiet hour.
            </li>
            <li>
              <strong className="text-ink">End with the four minutes.</strong>{" "}
              The silent eye contact at the end is the part most couples
              skip and most remember.
            </li>
          </ul>
        </section>

        <section id="why-they-work" className="mt-14 scroll-mt-20">
          <h2 className="font-serif text-2xl text-ink">
            Why mutual vulnerability works
          </h2>
          <p className="mt-3 text-ink-soft leading-relaxed">
            Aron's finding wasn't that any particular question is magic. It
            was that closeness grows when two people disclose at roughly the
            same pace, on roughly the same depth. One person opens; the other
            meets them there; the next question opens a little further. Done
            with care, that pattern teaches a relationship something it can
            keep using long after the list is finished: that it's safe to go
            first.
          </p>
          <p className="mt-4 text-ink-soft leading-relaxed">
            The questions don't make you fall in love. They make it easier
            to be known. With a stranger, that can feel like falling. With
            someone you've loved for years, it can feel like coming back.
          </p>
        </section>

        <section className="mt-14 rounded-2xl border border-ink/10 bg-paper-warm/40 p-6">
          <h2 className="font-serif text-2xl text-ink">
            One question a night, written for the two of you
          </h2>
          <p className="mt-3 text-ink-soft leading-relaxed">
            Our Journey sends one quiet question to both of you each evening.
            You each answer privately; once you've both written, the answers
            open. It's the same idea as the 36 questions, paced for the long
            run instead of a single night.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center rounded-full bg-rust px-5 py-2.5 text-paper text-sm font-medium hover:opacity-90 transition"
            >
              Start tonight
            </Link>
            <Link
              to="/resources/check-in-questions"
              className="inline-flex items-center rounded-full border border-ink/15 px-5 py-2.5 text-ink text-sm hover:bg-ink/5 transition"
            >
              More check-in questions
            </Link>
          </div>
        </section>

        <p className="mt-12 text-xs text-ink-mute">
          Adapted from Aron et al., "The Experimental Generation of
          Interpersonal Closeness" (1997). Written by the Our Journey team.
          Last updated June 25, 2026.
        </p>
      </article>
    </main>
  );
}
