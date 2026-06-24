
# Advanced Chapters — new quest categories

## Placement decision

Keep everything in the existing Quests tab. The page already greys out locked chapters inline (the `is_advanced` flag + `couple_unlocked('quests_advanced')` are wired up). Adding a separate "Advanced Chapters" section at the bottom would duplicate the gating UI for no real gain — and inline placement keeps Communication / Trust as the on-ramp, with the advanced categories visible (but locked) underneath so users can see what they're working toward.

No UI rewrite needed. The route already renders locked chapters with the lock icon and the "Unlocks at Level 8 · 14 shared days" line. We just seed new categories whose chapters are all `is_advanced = true`.

## New categories (positions 3–7)

All chapters in these categories are `is_advanced = true`, so the whole category greys out until the couple hits the quests_advanced threshold (Level 8 + 14 shared days, or paid).

1. **Intimacy** — *The language of closeness*
   - Touch, Without Errand — non-goal-oriented physical closeness
   - The Eye-Contact Minute — two minutes, no words
   - Naming What You Want — practicing the ask
   - Pleasure As Information — what your body is telling you
   - The Slow Return — re-finding each other after distance

2. **Aftercare: After Arguments** — *Returning to each other*
   - The 20-Minute Cooldown — what to do with the gap
   - The First Sentence Back — scripts for re-entry
   - Repair Without Re-litigating — closing the loop without reopening it
   - The Body Check-In — nervous systems before words
   - What We Learned — turning a rupture into a small agreement

3. **Aftercare: Closeness & Reassurance** — *The quiet hour after*
   - The Reassurance Ritual — the words that actually land
   - Holding, Not Fixing — being a steady presence
   - Tender Questions — what to ask when they're soft
   - The Comfort Inventory — each partner's specific comforts
   - A Hand on the Back — small physical anchors

4. **Conflict & Repair** — *The shape of a hard conversation*
   - Naming the Pattern — your couple's recurring loop
   - The Pause Word — a shared signal to slow down
   - Owning Your 10% — finding your part without flattening theirs
   - Apologies That Land — the four parts of a real apology
   - The Weekly Clearing — a 20-minute housekeeping ritual

5. **Desire & Curiosity** — *Staying interested in each other*
   - The Question You've Never Asked — one new thing this week
   - Erotic Curiosity — desire as exploration, not performance
   - The Future-Self Letter — who are you each becoming
   - Small Mysteries — protecting some unknown in each other
   - The Re-Meeting — meeting your partner as a stranger for an evening

## Implementation

**One migration** (`add_advanced_quest_categories.sql`):
- `INSERT INTO public.quest_categories` — five new rows at positions 3–7 with slugs `intimacy`, `aftercare-arguments`, `aftercare-closeness`, `conflict-repair`, `desire-curiosity`. Pick accents from the existing palette (`rust`, `clay`, plus we can reuse — accent is just a string).
- `INSERT INTO public.quest_chapters` for each category, with `is_advanced = true` set explicitly on every row.
- Seed `quest_steps` for each new chapter using the same 4-step (`solo`, `couple`, `solo`, `couple`) shape and the same DO block pattern already in the original seed, but with step content tuned per-chapter. Keeping the 4-step shape means no changes to step-completion logic, XP math, or chapter progress.

No schema changes, no RLS changes, no route changes, no `coupleLevel.ts` changes. The advanced-unlock gate, the lock UI, and the "Unlocks at Level 8 · 14 shared days" copy already exist.

## Out of scope

- No "Advanced Chapters" header/section at the bottom of the page.
- No new unlock tier — these all sit under the existing `quests_advanced` product.
- No changes to Communication / Trust content.
- No content for premium-only future tiers (Atlas / Time Capsule are separate products and stay where they are).

## Verification

- `tsgo --noEmit` (no TS changes expected — types regen after migration).
- Load `/quests` as a non-unlocked couple: five new categories appear after Trust, all chapters greyed with the lock line.
- Load `/quests` as the admin couple (admin bypass already covers `quests_advanced`): all five categories are interactive.

## Open question before I build

The chapter titles and step content above are a first pass in the app's existing voice (warm, quiet, literary — per workspace guidance). If you want to rewrite, reorder, or drop any category before I seed it into the database, say so and I'll adjust before the migration runs. Otherwise I'll proceed with exactly the list above.
