import { createFileRoute, Link } from "@tanstack/react-router";

const TITLE = "Daily Check-In Questions for Couples — A Quiet Guide";
const DESCRIPTION =
  "A categorized library of daily check-in questions for couples — relationship questions you can ask each other tonight, plus how to make the habit stick.";
const URL = "https://our-journey.life/resources/check-in-questions";

export const Route = createFileRoute("/resources/check-in-questions")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "keywords", content: "relationship questions for couples, couples check in questions, daily check-in questions, questions to ask your partner" },
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
  component: CheckInQuestionsPage,
});

type Category = {
  id: string;
  title: string;
  intro: string;
  questions: string[];
};

const CATEGORIES: Category[] = [
  {
    id: "today",
    title: "Today, gently",
    intro:
      "Short questions for a five-minute check-in. Good for weeknights and tired evenings.",
    questions: [
      "What was the smallest good moment of your day?",
      "What part of today are you glad is over?",
      "Where did you feel most like yourself?",
      "What's something you want me to know before tomorrow?",
      "Is there anything you need from me tonight — quiet, company, or something else?",
      "What kind of tired are you — body, mind, or heart?",
      "What's one thing you're carrying that you haven't said out loud yet?",
    ],
  },
  {
    id: "us",
    title: "How we're doing",
    intro:
      "Questions about the relationship itself. Save these for the week's slower night.",
    questions: [
      "When did you feel closest to me this week?",
      "Is there a moment between us you'd like to revisit?",
      "What's something I've done lately that meant more than I probably know?",
      "Where do you wish we had a little more of each other?",
      "What's one small thing I could do this week that would feel like care?",
      "Is there anything unsaid between us that's quietly taking up room?",
      "What's a habit we've fallen into that you actually love?",
    ],
  },
  {
    id: "feelings",
    title: "Feelings, without the script",
    intro:
      "When 'how are you' isn't enough. Asked with patience, not pressure.",
    questions: [
      "What feeling has been loudest for you this week?",
      "What are you anxious about that I might not have noticed?",
      "When did you last feel proud of yourself?",
      "What's something you've been avoiding thinking about?",
      "Is there a worry I can help you put down for tonight?",
      "What do you need to feel safe talking about right now?",
      "What would help you feel less alone in this?",
    ],
  },
  {
    id: "future",
    title: "Where we're heading",
    intro:
      "Slow questions about the year ahead. Don't expect answers in one sitting.",
    questions: [
      "What does a good next season look like to you?",
      "What's something you want to try together that we keep postponing?",
      "What would you like more of in our life a year from now?",
      "Is there a dream you've stopped saying out loud?",
      "What kind of partner do you want to be becoming?",
      "What would 'enough' look like for us — money, time, space?",
      "What's one decision we keep dancing around?",
    ],
  },
  {
    id: "tender",
    title: "Tender ground",
    intro:
      "For repair, or for the conversations you've been circling. Soft pacing matters more than the question.",
    questions: [
      "Is there something I said recently you're still sitting with?",
      "When have I made you feel most understood?",
      "What's a small resentment we should air before it grows?",
      "Where in your life do you feel least supported by me?",
      "What's something you'd like me to do differently — said kindly?",
      "What old hurt of yours do you wish I held more carefully?",
      "What would forgiveness look like, if we needed it tonight?",
    ],
  },
  {
    id: "gratitude",
    title: "Quiet gratitude",
    intro:
      "End on these. A gentle close that compounds over months.",
    questions: [
      "What's one thing I do that you'd miss most if it stopped?",
      "What part of our ordinary life feels like a small luxury?",
      "Who are we together that you didn't expect to be?",
      "What memory of ours have you replayed this week?",
      "What's one thing you're grateful for that has nothing to do with me?",
      "What's a recent kindness from a stranger that stayed with you?",
      "What would you want to remember about right now, ten years from now?",
    ],
  },
];

function CheckInQuestionsPage() {
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
          Daily check-in questions for couples
        </h1>
        <p className="mt-6 text-ink-soft text-lg leading-relaxed">
          A small library of relationship questions for couples — categorized,
          honest, and built for the kind of evening when neither of you has the
          energy to invent one from scratch. Use a few. Skip the rest. The habit
          matters more than the question.
        </p>

        <nav aria-label="Categories" className="mt-10">
          <h2 className="text-xs uppercase tracking-[0.18em] text-ink-mute">
            Inside this guide
          </h2>
          <ul className="mt-3 space-y-1.5 text-ink-soft">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className="text-rust underline-offset-4 hover:underline"
                >
                  {c.title}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#how-to-use"
                className="text-rust underline-offset-4 hover:underline"
              >
                How to make a check-in stick
              </a>
            </li>
          </ul>
        </nav>

        {CATEGORIES.map((c) => (
          <section key={c.id} id={c.id} className="mt-12 scroll-mt-20">
            <h2 className="font-serif text-2xl text-ink">{c.title}</h2>
            <p className="mt-2 text-ink-soft leading-relaxed">{c.intro}</p>
            <ol className="mt-5 space-y-3 list-decimal pl-5 marker:text-ink-mute">
              {c.questions.map((q) => (
                <li key={q} className="text-ink-soft leading-relaxed">
                  {q}
                </li>
              ))}
            </ol>
          </section>
        ))}

        <section id="how-to-use" className="mt-14 scroll-mt-20">
          <h2 className="font-serif text-2xl text-ink">
            How to make a check-in stick
          </h2>
          <p className="mt-3 text-ink-soft leading-relaxed">
            The hardest part of couples check-in questions isn't picking the
            right one. It's showing up on the nights you don't feel like it.
            A few small rules that help:
          </p>
          <ul className="mt-5 space-y-3 text-ink-soft leading-relaxed list-disc pl-5 marker:text-ink-mute">
            <li>
              <strong className="text-ink">Pick a time, not a mood.</strong>{" "}
              Right after dinner, or with the last cup of tea. Moods come and
              go; the timeslot is what becomes the habit.
            </li>
            <li>
              <strong className="text-ink">One question is enough.</strong>{" "}
              Five minutes beats forty minutes you'll only do once.
            </li>
            <li>
              <strong className="text-ink">Write before you speak.</strong>{" "}
              Even one line. It slows the conversation down and keeps the
              louder partner from setting the frame.
            </li>
            <li>
              <strong className="text-ink">Don't fix during the check-in.</strong>{" "}
              Reflect. Repair on a different night, when the goal is repair.
            </li>
            <li>
              <strong className="text-ink">Skip without guilt.</strong>{" "}
              Missing a night isn't breaking the streak — restarting the next
              night is the streak.
            </li>
          </ul>
        </section>

        <section className="mt-14 rounded-2xl border border-ink/10 bg-paper-warm/40 p-6">
          <h2 className="font-serif text-2xl text-ink">
            A nightly prompt, written for you
          </h2>
          <p className="mt-3 text-ink-soft leading-relaxed">
            Our Journey sends one quiet question to both of you each evening.
            You each answer privately; once you've both written, the answers
            open. Your history stays just for the two of you.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center rounded-full bg-rust px-5 py-2.5 text-paper text-sm font-medium hover:opacity-90 transition"
            >
              Start tonight
            </Link>
            <Link
              to="/"
              className="inline-flex items-center rounded-full border border-ink/15 px-5 py-2.5 text-ink text-sm hover:bg-ink/5 transition"
            >
              See how it works
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
