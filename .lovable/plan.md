## Audit: Our Journey

Read with five hats on. Findings are scoped to what already exists — no new features.

---

### 1 · Critical (broken or actively misleading)

**Chapter celebration has two buttons that do the same thing.** `quests.$chapter.tsx:91-99` — "Back to quests" and "Next chapter" both call `navigate({ to: "/quests" })`. The right column should jump to the *actual* next chapter (resolved from category order). Until that wiring is in, collapse to a single primary button. Two buttons that do the same thing is the loudest "this app was hand-waved" signal we ship.

**Daily reveal still requires a manual refresh.** `daily.tsx:138-168` and `today-hero.tsx:105-136` both tell the user to "refresh to reveal" — yet `useDailyRealtime(coupleId)` is already mounted on the Daily page (and absent from Home). Fix: subscribe to the same channel on Home, drop the "refresh to open today" copy, and let the reveal state appear on its own. The whole emotional payoff of the seal mechanic dies if the user has to pull-to-refresh to receive it.

**Together steps can be marked complete unilaterally with no partner signal.** `quests.$chapter.tsx:110-153` — a "Together" StepCard renders the same textarea and "Mark complete" button as a Solo step. Either show partner completion state on couple steps (mirror the daily seal/reveal pattern) or rename the action to "Mark done on my side" and surface "Waiting on {partner}". Right now a Together step is functionally Solo + a Users icon.

**Native `confirm()` for "Leave couple".** `profile.tsx:86` — jarring break in the otherwise crafted UI, and on iOS Safari it can be dismissed accidentally with no audit trail. Use the same modal pattern as the chapter celebration.

**Auth route metadata points at the wrong domain.** `auth.tsx:18-20` — `og:url` and canonical link to `https://ourjourney.app/auth`. The real domain is `our-journey.life`. Quiet bug, but it's already in production HTML.

---

### 2 · UX architecture (the spine is wobbly)

**Bottom-tab order fights its own data.** `app-shell.tsx:28-33` — order is Home / Quests / Daily / You, but Daily is the highest-frequency action and is also the only tab carrying a dot indicator. It has `emphasis: true` in the data but the prop is never visually applied. Move Daily to position 2, raise it visually (filled circle or slightly larger icon when active), and make the indicator dot consistent with one other surface (e.g. an unread partner letter, an unread "next step" in the active chapter).

**LevelHeader eats the mobile fold.** `level-header.tsx` + `home.tsx:91-98` — on a 676×714 viewport, eyebrow ("Volume One") + greeting + two stat badges + XP bar + Together card pushes the actual Today's Spark below the fold. The hero is the product. Collapse the header to one row: small name, streak chip, level chip. Move XP progress and bond into Profile.

**"Volume One" is everywhere and means nothing yet.** Header eyebrow, Quests page eyebrow, chapter celebration footer, profile footer. Until there's a Volume Two, drop the label everywhere except one tasteful place (Profile footer).

**Streak/freeze label flickers between two info architectures.** `level-header.tsx:24` — sub-label switches from "days" to "1 freeze" depending on state. The eye relearns the field every visit. Pick one: always show `streak · N freeze${pl}` underneath the number.

**Profile page is thin and oddly proportioned.** `profile.tsx` — the "How streaks work" explainer is taller than the actual stats. Trim it to two sentences, demote it below settings, and give the couple-streak card the visual weight the user actually came for (longest streak, days together, last together date already exist — give them their own tiles instead of a single dense paragraph).

**Invite code field is shown on sign-in too.** `auth.tsx:154-160` — the code is already persisted via `localStorage` (`PENDING_INVITE_KEY`). Show the field only when `join` is present or after the user opts in via "Have an invite code?" link. Removes one field of friction for the 95% case.

---

### 3 · Content & voice (the editor's pass)

**Onboarding contradicts your own Field Note.** Step 4 asks for *one* love language as a definitive answer; the "Beyond love languages" insight explicitly critiques that framing (and cites Sue Johnson doing the same). Either let the user pick a primary + a "shifts under stress" secondary, or reframe the question as "Which one do you reach for first?" with a note that this isn't a verdict.

**"+50 XP / +30 XP" sprinkled inline fights the literary register.** `daily.tsx:126`, `:179`, `:207`, `today-hero.tsx:100,132`, `quests.$chapter.tsx:58,127`. The voice is Brian Doyle; the receipts read like Duolingo. Move XP into a single quiet line at the end of an action ("Saved. Day {n}.") and let the streak/level header carry the numeric reward.

**Quote-mark glyphs are a fragile decoration.** `today-hero.tsx:85-87`, `daily.tsx:108-109`, `quests.$chapter.tsx:130-131` — a giant `"` rendered as text and pulled up with `-mt-3` to overlap the next line. On any line-height shift it breaks. Use a proper pseudo-element (`::before { content: '\201C'; }`) on the headline or drop it and trust the serif italics.

**Field Notes badge "90-second reads" is now a lie for some.** `home.tsx:141` — three of the rewritten notes are 3-minute reads. Either label "1–3 min reads" or compute from the data.

**Tag-derived category labels leak internal taxonomy.** `insights.$slug.tsx:22-29` — tags like `daily`, `attention`, `attachment` get title-cased into a header. "Daily" is not a category a reader recognizes. Either curate a real `category` column or hide the chip entirely.

**Letters has no on-ramp.** `letters-inbox.tsx:108-115` — first-time composer is a blank textarea with placeholder "Something you want them to read…". The empty state copy on the list ("slow love") is beautiful; carry that same warmth into the composer with two or three rotating starter prompts as ghost text or chip suggestions.

**"Hi, {name}" in italics on every Home visit.** Lovely once. Predictable by day 3. Rotate three or four openings ("Welcome back, {name}." / "It's a {weekday}, {name}." / "{name} — quietly."). Cheap, big effect.

---

### 4 · Therapist's read (what the content is doing emotionally)

**The seal/reveal mechanic has no graceful escape.** If one partner doesn't open the app for two days, the other partner is stuck — can't see anything, can't move on, can't write today. Add a soft auto-unseal at +48h with a note ("{partner} hasn't arrived yet — you can keep your answer private or open it on your own"), so the responsible partner isn't punished for the other's silence.

**Solo reflection placeholder is generic across every prompt.** `daily.tsx:199` — "What made you write what you wrote? Or — what would you have liked to say?" is a great fallback, but the prompt context is already loaded. Tailor 3–4 placeholder variants by prompt `theme` (gratitude, growth, tenderness, curiosity, memory).

**Quest steps have no rest between them.** Four steps stacked on one chapter page, all expanded, all asking for vulnerable writing — it reads like a worksheet. Collapse non-active steps into a quiet row (number, title, kind, +XP), expand only the next incomplete one. Therapeutically: one move at a time.

**No closure ritual between chapters.** Chapter completion shows a modal, but there's no integration prompt ("What's one thing from this chapter you want to keep?"). One short final reflection saved to the user's private archive would convert the chapter from "tasks done" to "story remembered."

**Goals chosen at onboarding never reappear.** `onboarding.tsx:41-50, 188-203` — user picks up to three growth goals; the app never references them again. Either surface them on Profile as "What you said you wanted to grow" with a quiet edit affordance, or remove the question. Asking for vulnerability you then ignore is the relational mistake the app is supposed to prevent.

---

### 5 · Mobile UI craft

**StatBadges can overflow.** `level-header.tsx:22-26` — long display names + two right-side badges have no `min-w-0` / `truncate` (see responsive-layout-patterns). Wrap the greeting in `min-w-0` with `truncate`, badges in `shrink-0`.

**Invite-code button is cramped at small widths.** `today-hero.tsx:43-49` — `tracking-[0.3em]` on the code plus eyebrow + icon overflow on <360px. Drop to `tracking-[0.2em]` below `sm:`, or stack eyebrow above the code.

**Letters composer dismisses on backdrop tap and discards text silently.** `letters-inbox.tsx:101-126` — confirm before close when `body.trim().length > 0`, or persist a draft.

**Insight reader progress bar can sit at <100% on short articles** because the article is shorter than the viewport. Cap the calculation: if `el.offsetHeight <= viewport`, set progress to 1.

**Quests index has no skeleton.** `quests.index.tsx:35-40` shows skeleton only after a render, never on first paint. Match the daily/home loading shape.

**Chapter page uses bare "Loading…" text** instead of a skeleton (`quests.$chapter.tsx:35`). Inconsistent with the rest of the app.

**`pb-24` on AppShell** vs the nav using safe-area inset — on devices with no inset the nav floats with content visible behind the rounded edge. Bump to `pb-28` or compute from nav height.

---

### 6 · Accessibility (quick pass, not exhaustive)

- Bottom-nav tap targets are ~44px borderline; bump `py-2` to `py-2.5`.
- Chapter celebration close button (`X`) is the only `aria-label`'d control in the modal — the modal itself lacks `role="dialog"` / `aria-modal` / focus trap. Same for Letters composer.
- Daily textarea uses `autoFocus` on mount of an authenticated route — fine, but on slow renders it can scroll the page unexpectedly on iOS. Gate behind a `useEffect` after mount.
- Quote-glyph `"` text isn't `aria-hidden`; screen readers announce "quotation mark" before every prompt.
- All routes correctly use `noindex,nofollow` on authenticated pages. Good.

---

### Suggested execution order

If you want to pick this up incrementally, in priority of return-on-effort:

1. Fix the duplicate chapter-end buttons + add real next-chapter routing.
2. Make Daily reveal realtime end-to-end (subscribe on Home; remove "refresh" copy).
3. Compress LevelHeader; demote "Volume One"; rotate the greeting.
4. Collapse quest steps to one-active-at-a-time; add a closure reflection.
5. Replace native `confirm()` with the modal pattern; replace Letters/celebration with proper `role="dialog"` + focus trap.
6. Tone the XP receipts down; fix the quote-glyph layout; correct the "90-second" badge; hide tag-derived categories.
7. Auth domain metadata; auth code field gated behind invite intent.
8. Onboarding love-language reframe; surface chosen goals on Profile.
9. Mobile overflow + skeleton + tap-target polish pass.

I won't touch any of this until you tell me which slice to ship first.
