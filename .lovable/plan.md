# Our Journey — Audit & Premium Brainstorm

Scope: improvements to surfaces already in the app (Home, Daily, Quests, Chapter, Insights, Onboarding, Profile, Letters) plus two paid one-time unlocks. No new free features.

---

## Part 1 — Ranked improvements (most → least beneficial)

### 1. Make the Daily reveal feel like a real moment
Today it's a state flip. Add a one-time, ~1.2s synchronized reveal: both responses fade in side-by-side with the prompt floating above, a faint "sealed → opened" line, and a single quiet haptic on mobile. After the first view it stays as a static side-by-side. This is the emotional core of the product and currently reads like a form submit.

### 2. Replace the streak with a "rhythm" model
Streak counters punish couples for life. Swap the flame number for a 14-dot rhythm ring (filled = both wrote, half = one wrote, empty = skipped). Keeps honest signal, removes shame, and makes a missed day recoverable instead of catastrophic. Snowflake/freeze logic collapses into the same view.

### 3. Tighten the Home hero to one decision
Home currently surfaces prompt + previews + invite + goals + inbox + insights teaser. Collapse to: greeting line, rhythm ring, one hero card with the single next action ("Write today's Spark" / "Waiting on [partner]" / "Open today's reveal"), then a single secondary row. Everything else moves below the fold.

### 4. Chapter step UX — show the why, not just the task
Each step currently shows title + body + textarea. Add a 1-line "why this matters" pulled from the step's theme (attachment, repair, bids, etc.) and a soft word-count floor (~40 words) before submit enables, with copy "take your time" rather than a hard error. Lifts reflection quality without changing schema.

### 5. Letters inbox → "Letters" surface
Inbox is buried on Home. Promote to its own tab affordance inside the existing nav (no new route file needed — reuse `letters-inbox.tsx` as a sheet from the app shell). Add unread dot, sort by unread first, and a gentle "write one back" CTA inside an opened letter.

### 6. Onboarding: pacing + a real "why we're here"
Add one screen between name and love-language: "In one sentence, why are you here?" Free-text, private to the writer, surfaced back on their 30/60/90-day recap. Highest-leverage data we're not capturing.

### 7. Insights detail polish
`insights.$slug.tsx` reads like a doc. Add: estimated read time, a pull-quote block, and a single "try this tonight" ritual at the end that links into a matching chapter step if one exists.

### 8. Profile: make goals living
Goals are editable but static. Show a faint "last reviewed" date and prompt a 30-second re-check every 4 weeks. Couples drift; goals should drift with them visibly.

### 9. Empty + waiting states
"Waiting on partner" screens are flat. Replace with a soft illustration block + an honest line ("They haven't opened today yet. That's okay.") + a single "nudge" action that sends one push/email per 24h max.

### 10. Typography + spacing pass
Body copy is 15/22 in most places; bump to 16/26 on prompts and reflections, tighten card padding from 24 to 20, and standardize on two type sizes per screen. Mobile readability win, zero logic risk.

### 11. Haptics + sound, restrained
One haptic on submit, one on reveal, none anywhere else. No sound by default; optional "chime on reveal" in Profile.

### 12. Accessibility sweep
Focus rings on all card-as-button surfaces, `aria-live="polite"` on the reveal region, prefers-reduced-motion respected on the reveal animation, and ensure the rhythm ring has a text equivalent.

---

## Part 2 — Two premium one-time unlocks

Design constraints I held to: each must be (a) emotionally meaningful, not a utility; (b) impossible to fake with the free tier; (c) re-openable forever after purchase, not a subscription; (d) sold separately so a couple can buy one without the other.

### Brainstorm pool (rejected, for context)
- Extra chapters → feels like a content drip, not premium.
- Custom themes → cosmetic, doesn't deepen the relationship.
- AI couples coach chat → undermines the app's quiet voice and raises safety concerns.
- Export to PDF → utility, not luxury.
- Voice notes on daily → nice, but a feature not a moment.
- Anniversary video montage → too gimmicky, AI-slop risk.

### Premium Unlock A — **The Time Capsule** (one-time purchase)

A sealed, dated letter exchange to your future selves. On purchase, the couple co-creates a single capsule:

- Each partner privately answers 7 curated prompts (e.g. "What do you want us to remember about right now?", "What are you afraid we'll forget?", "What's a promise you want to keep to them?").
- They each record one ~60s voice note answering an 8th prompt of their choice.
- They jointly pick the seal date: 1, 3, 5, or 10 years out.
- The capsule is cryptographically sealed — neither partner can re-read their own or the other's answers until the date.
- A single Home card appears year-round: "Capsule sealed until March 14, 2028" with a quiet countdown.
- On unseal day, a guided 20-minute reveal flow walks them through opening together, with a 9th "now" prompt to compare who they were vs. who they became.

Why it justifies a price: it's a one-shot artifact with a multi-year payoff, requires storage of audio for years, and creates a reason to keep the app installed.

Premium-feel details: physical-letter typography, wax-seal motif (subtle, not skeuomorphic), an emailed PDF transcript on unseal, and the option to add up to 3 additional unseal dates later (each as a free "letter" inside the capsule).

### Premium Unlock B — **The Atlas** (one-time purchase)

A living, private map of the relationship — sold as the "deep" companion to the daily/quest loop.

Three connected surfaces, unlocked together:

1. **Patterns** — a quarterly synthesis generated from the couple's reflections (server-side, on demand, not a chat). Reads like a thoughtful letter: "Over the last 90 days you returned to repair three times. Here's what you each tend to do first." Generated max 4×/year per couple. Human-edited prompt templates, not freeform AI chat.
2. **The Map** — a single-page visual: chapters completed, themes you've returned to, words you each use most when describing the other, the rhythm ring across the full history. Designed to feel like a printable keepsake.
3. **Rituals Library** — 24 curated rituals (weekly check-in, repair script, monthly state-of-us, gratitude exchange, conflict timeout protocol, etc.), each with a "schedule into our rhythm" action that quietly slots into upcoming Daily slots.

Why it justifies a price: it's the "therapist's binder" version of the app — synthesis + structure + library — and it's the natural upgrade for couples who finish the free chapters and want depth, not more prompts.

Premium-feel details: serif-led layout distinct from the rest of the app, exportable as a single bound PDF once per quarter, and the Patterns letter is signed off with the date and a single hand-set pull-quote from the couple's own words.

### Why two, sold separately
- **Capsule** is for couples in a good place who want to mark it.
- **Atlas** is for couples doing the work who want to see the shape of it.
Different emotional jobs, different buyers, often bought at different moments in the relationship. Bundling them would flatten both.

---

## Part 3 — Suggested sequencing if you greenlight any of this

1. Items 1–3 from Part 1 (reveal moment, rhythm model, Home focus) — biggest perceived-quality lift, ~1–2 days of work, no schema changes.
2. Items 4–6 — meaningful depth, small schema additions for onboarding "why".
3. Premium Unlock A (Capsule) — needs payments + storage + scheduled unseal job, but is self-contained.
4. Items 7–12 — polish pass.
5. Premium Unlock B (Atlas) — largest scope; do last, after the free product is tight enough to deserve a premium tier.

No code changes in this plan — say the word on which items to build and I'll scope each in turn.
