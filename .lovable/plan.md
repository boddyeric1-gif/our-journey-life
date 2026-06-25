# Quests revisit + reflection clarity + solo-user progression

Four coordinated changes, grouped by file. No new tables; one DB function replacement.

---

## 1. Re-read completed quest steps (and completed chapters)

**File:** `src/routes/_authenticated/quests.$chapter.tsx` (presentation only).

Today, once a step is done it collapses to `DoneRow` ("Step 4 · Together") and the teaching, prompt, ritual, and the user's saved reflection are no longer visible. Once a whole chapter is finished the page is just a stack of those one-liners.

Make `DoneRow` an expandable card:

- Collapsed state matches today — compact, low-emphasis.
- Add a small right-aligned "Re-read" affordance (chevron + label).
- Expanded state renders, in the same visual language as `ActiveStep` but read-only and dimmed:
  - the teaching paragraph
  - the prompt (serif quote)
  - the ritual line, if any
  - **Your reflection** — `step.completion.body` if present; otherwise a quiet "No note saved." line
  - a completion timestamp ("Marked done · Jun 24")
- Plain `<button>` toggling local `useState`, `aria-expanded` + `aria-controls`. Multiple done steps can be open independently.

No server changes — `getChapter` already returns `completion: { body, created_at } | null` for the current user. Revisiting a finished chapter already works at the route level (navigating from `/quests` loads regardless of progress); this just makes the content readable.

Out of scope: showing the partner's reflection (RLS hides partner bodies — separate product call) and editing a saved reflection.

---

## 2. Clarify the reflection box in the active step

**File:** same route file, inside `ActiveStep`.

Right now `ActiveStep` shows teaching + prompt + ritual and drops straight into a textarea with placeholder "A few sentences. Slow is fine…" and helper "Optional — but most of the work happens here." Users (you and your partner included) read the prompt as the *task* and don't realise the textarea is for their own reflection — the 40-word floor then feels arbitrary.

Above the textarea, add a labelled reflection header:

- Small uppercase eyebrow `YOUR REFLECTION` (matches the existing `RITUAL ·` style).
- One-line guidance: *"After you've done the exercise above, write a few sentences about how it landed — what you noticed, what surprised you, what you want to remember."*
- Wire `<label htmlFor>` + textarea `id` so the eyebrow is the accessible label.
- Tighten the placeholder to a short hint: *"What came up for you?"*

Reframe the helper line beneath the textarea so the 40-word floor reads as guidance, not a gate:

- 0 words → "Optional — but the reflection is where it lands."
- 1–39 words → "A bit more if you can · {n}/40 words"
- ≥ 40 → "{n} words · ready when you are" (unchanged)

Keep the existing `tooShort` submit-disable logic — the floor is fine, it just wasn't explained.

---

## 3. Database: scale "shared day" threshold to couple size

**Migration:** replace `public.couple_shared_days(_couple_id uuid)` with the same signature, return type, `STABLE SECURITY DEFINER`, and `search_path = public`. Only the `HAVING` clause changes:

```sql
HAVING COUNT(DISTINCT user_id) >= LEAST(
  2,
  (SELECT COUNT(*) FROM public.couple_members WHERE couple_id = _couple_id)
)
```

Effect: a 1-member couple needs 1 active user per day to count that day; a 2-member couple still needs both. `is_couple_member` guard and the outer `CASE` are preserved. No grants change — same function name and callers (`couple_unlocked`, home "shared days to go" copy) automatically pick up the new value.

**Flag before shipping:** this unlocks advanced quests, Time Capsule, and The Atlas for fully solo users. Advanced quests and Atlas are fine solo, but Time Capsule is built around sending a message to a partner. If you'd rather keep Time Capsule paired-only, add one clause at the top of `couple_unlocked`: `IF _product = 'time_capsule' AND (SELECT COUNT(*) FROM couple_members WHERE couple_id = _couple_id) < 2 THEN RETURN FALSE; END IF;`. Default in this plan is **not** to add it, matching what you described — say the word and I'll fold it into the same migration.

---

## 4. Home hero: invite is hero for the first week, daily prompt after

**File:** `src/routes/_authenticated/home.tsx` (and a small co-located `InviteCodeCard`).

Current behaviour: the `data.kind === "paired"` branch (which fires for both unpaired-with-couple-row and truly paired users) sets `heroState = "unpaired"` whenever `!data.partner`, permanently locking solo users out of the daily prompt.

Replace the `if (!data.partner) { heroState = "unpaired"; … }` branch with:

- `!data.partner && (data.daysTogether ?? 0) < 7` → `heroState = "unpaired"` (unchanged for new accounts).
- `!data.partner && daysTogether >= 7` → fall through to the same prompt-state logic the paired branch uses (`no-prompt-answered`, `mine-done-partner-waiting`, `both-done`). `partnerPreview` is always null here, so `mine-done-partner-waiting` is the natural post-submit state. Still set `inviteCode = data.pendingInvite?.code` so we can render it as a secondary card.

Below `<TodayHero>` (around line 160, before the "Quest in progress" card), render a secondary invite card when `data.kind === "paired" && !data.partner && heroState !== "unpaired" && inviteCode`:

- `surface-card-quiet` to match neighbouring secondary cards.
- Small uppercase eyebrow "Invite your partner", one-line context ("Their view fills in once they join"), invite code in mono, "Copy code" button.
- Reuse `TodayHero`'s existing copy interaction by extracting a small `InviteCodeCard` (co-located in the route file). If `TodayHero` already has a reusable invite block, lift it — pick the smaller diff after a quick look at `today-hero.tsx`.
- Keep `LevelHeader`'s `paired={... && !!data.partner}` and `unreadLetters` gating unchanged — those features genuinely require a partner.

"Quest in progress", "Field notes", and goals already render for solo couples (they live under `data.kind === "paired"`), so no other conditional changes.

---

## Verification

- `bunx vitest run` (covers existing `src/lib/coupleLevel.test.ts` and any streak/XP tests) to confirm the unlock math still holds.
- Manual walk of a solo account:
  - day 0 → invite hero, no daily prompt.
  - day 7+ → daily prompt as hero, invite card secondary; submit → `mine-done-partner-waiting`.
- Manual walk of a completed quest chapter: expand each done step, confirm teaching/prompt/ritual/saved reflection render correctly and read-only.
- Manual walk of an active step: confirm the reflection header reads as a label and the helper copy progresses through 0 → <40 → ≥40 word states.

## Out of scope

- An archive view of all completed chapters across categories.
- Editing a saved reflection after submit.
- Showing the partner's reflection on completed together-steps.
- Renaming `couple_shared_days` / `couple_unlocked` or reworking the "shared days to go" copy for soloists.
- Any change to Time Capsule / Atlas product gating (see flag in §3).
