import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security & Updates — Our Journey" },
      {
        name: "description",
        content:
          "How Our Journey keeps your shared writing safe — the controls we enforce, the dependencies we keep current, and recent updates worth knowing about.",
      },
      { property: "og:title", content: "Security & Updates — Our Journey" },
      {
        property: "og:description",
        content: "Controls we enforce and recent dependency updates.",
      },
    ],
  }),
  component: SecurityPage,
});

type AdvisoryStatus = "patched" | "monitoring";

type Update = {
  date: string;
  title: string;
  summary: string;
  status: AdvisoryStatus;
  refs?: { label: string; href: string }[];
};

// Maintained by the Our Journey team. New entries go at the top.
const UPDATES: Update[] = [
  {
    date: "June 24, 2026",
    title: "TanStack Start bumped to 1.168.x",
    summary:
      "Pulled in patched undici (TLS bypass, WebSocket DoS, SOCKS5 pool reuse, Set-Cookie header injection, shared-cache disclosure) and the TanStack server-core sibling-function deserialization fix.",
    status: "patched",
    refs: [
      { label: "GHSA-vmh5-mc38-953g", href: "https://github.com/advisories/GHSA-vmh5-mc38-953g" },
      { label: "GHSA-vxpw-j846-p89q", href: "https://github.com/advisories/GHSA-vxpw-j846-p89q" },
      { label: "GHSA-hm92-r4w5-c3mj", href: "https://github.com/advisories/GHSA-hm92-r4w5-c3mj" },
      { label: "GHSA-p88m-4jfj-68fv", href: "https://github.com/advisories/GHSA-p88m-4jfj-68fv" },
      { label: "GHSA-pr7r-676h-xcf6", href: "https://github.com/advisories/GHSA-pr7r-676h-xcf6" },
      { label: "GHSA-9m65-766c-r333", href: "https://github.com/advisories/GHSA-9m65-766c-r333" },
    ],
  },
  {
    date: "June 24, 2026",
    title: "Subscription tier locked to server-only updates",
    summary:
      "Column-level grants on profiles and couples now exclude subscription_tier from anything the app can write directly. Database triggers reject any tier change that isn't coming from the payment webhook.",
    status: "patched",
  },
  {
    date: "June 24, 2026",
    title: "Internal database helpers tightened",
    summary:
      "Trigger-only functions can no longer be called over the API. Row-level security helper predicates are restricted to signed-in users.",
    status: "patched",
  },
  {
    date: "June 24, 2026",
    title: "js-yaml merge-key DoS (GHSA-h67p-54hq-rp68)",
    summary:
      "Resolved to js-yaml 4.1.1, which contains the upstream fix. Only reachable through build-time YAML parsing, never user input.",
    status: "patched",
    refs: [
      { label: "GHSA-h67p-54hq-rp68", href: "https://github.com/advisories/GHSA-h67p-54hq-rp68" },
    ],
  },
];

function SecurityPage() {
  return (
    <main className="relative z-10 min-h-[100svh]">
      <header className="px-6 pt-8">
        <Link to="/" className="serif-italic text-rust text-xl">
          Our Journey
        </Link>
      </header>
      <article className="px-6 pt-10 pb-20 max-w-2xl mx-auto prose-content">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-mute">
          Security &amp; updates
        </p>
        <h1 className="mt-4 font-serif text-4xl text-ink leading-tight">
          What we keep current, and how.
        </h1>
        <p className="mt-6 text-ink-soft text-lg leading-relaxed">
          This page is maintained by the Our Journey team. It lists the
          controls we enforce day to day and the dependency updates worth
          knowing about. It isn't an independent certification — just an
          honest log.
        </p>

        <Section title="Controls in place">
          <ul className="mt-2 space-y-2 list-disc list-outside pl-5 marker:text-ink-mute">
            <li>
              Row-level security on every table that holds a couple's writing,
              scoped to the signed-in user.
            </li>
            <li>
              Sensitive columns (like subscription tier) are server-managed
              only — the app cannot change them directly.
            </li>
            <li>
              Payment webhooks verify the provider signature before any state
              change.
            </li>
            <li>
              Continuous integration runs a dependency audit on every change
              and on a daily schedule, failing builds on high or critical
              advisories.
            </li>
          </ul>
        </Section>

        <Section title="Recent updates">
          <ul className="mt-4 space-y-6">
            {UPDATES.map((u) => (
              <li key={u.title} className="border-l border-ink/10 pl-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs uppercase tracking-[0.14em] text-ink-mute">
                    {u.date}
                  </span>
                  <StatusBadge status={u.status} />
                </div>
                <h3 className="mt-2 font-serif text-xl text-ink">{u.title}</h3>
                <p className="mt-2 text-ink-soft leading-relaxed">{u.summary}</p>
                {u.refs && u.refs.length > 0 ? (
                  <p className="mt-3 text-sm text-ink-mute">
                    Advisories:{" "}
                    {u.refs.map((r, i) => (
                      <span key={r.href}>
                        <a
                          href={r.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-rust underline-offset-4 hover:underline"
                        >
                          {r.label}
                        </a>
                        {i < u.refs!.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Reporting a vulnerability">
          If you believe you've found a security issue, please write to{" "}
          <a
            className="text-rust underline-offset-4 hover:underline"
            href="mailto:security@ourjourney.app"
          >
            security@ourjourney.app
          </a>
          . We'll confirm within two business days and keep you posted while
          we work on a fix.
        </Section>

        <p className="mt-12 text-xs text-ink-mute">
          Last updated: June 24, 2026.
        </p>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl text-ink">{title}</h2>
      <div className="mt-3 text-ink-soft leading-relaxed">{children}</div>
    </section>
  );
}

function StatusBadge({ status }: { status: AdvisoryStatus }) {
  const label = status === "patched" ? "Patched" : "Monitoring";
  return (
    <span className="inline-flex items-center rounded-full border border-ink/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-mute">
      {label}
    </span>
  );
}
