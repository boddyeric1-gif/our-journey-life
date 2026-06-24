# Remaining improvements

Grouped by effort and risk. Items can be done independently — pick any subset.

## Group A — Medium-impact fixes (~60–90 min)

**A1. Quest chapter N+1 (B3)** — `home.functions.ts:150-161` loops chapters and queries `quest_steps` per chapter to find the next incomplete step. Replace with one query that fetches all steps ordered by `(chapter.position, step.position)` and finds the first not in the completed set.

**A2. Couple-streak query collapse (B5)** — `home.functions.ts:319-336` runs 2 sequential queries per member (4 round-trips for 2 members). Replace with a single SQL function `couple_both_active_on(_couple_id uuid, _date date) returns boolean` checking both members in one query, then advance the streak row.

**A3. Diverged streak logic (B4)** — `quest.functions.ts:132-147` and `home.functions.ts:289-317` re-implement the same streak math twice with subtle differences (quest path doesn't update `longest_streak` when `diff != 1 && diff != 2`). Extract one `advanceUserStreak(supabaseAdmin, userId, userTz)` helper used by both call sites.

**A4. Atomic goals save (B6)** — `onboarding.functions.ts` `updateCoupleGoals` deletes then inserts; a failed insert leaves the couple with no goals. Wrap in a `replace_couple_goals(_couple_id uuid, _goals text[])` SQL function that runs DELETE + INSERT in one transaction.

**A5. Checkout-return entitlement check (U3)** — Verify the entitlement actually landed before showing success copy on the return page; if missing, show "We'll have it ready in a moment" and poll once.

**A6. Reflection timezone (U4)** — `solo_reflections` uses `todayUTC()` for `prompt_date` while streaks use `localToday(userTz)`. Switch the insert to `localToday(userTz)` so a late-night reflection counts toward the local day. One-line change + verify uniqueness constraint still holds.

## Group B — Polish (~20 min)

**B1. Goals click feedback (U1)** — In the goals editor, when the user clicks a 4th goal it silently does nothing. Add a small "Up to three" hint that flashes on the rejected click.

**B2. Profile loading skeleton (U2)** — Replace `<div className="p-10 text-ink-mute">Loading…</div>` in `profile.tsx:60` with the existing `HeaderSkeleton` for visual consistency.

**B3. OG images for shareable routes (E1/E2)** — Add `og:image` and `twitter:image` to `/` (`src/routes/index.tsx`) and `/join/$code` (`src/routes/join.$code.tsx`). Use an existing brand asset or generate one cover image.

## Group C — Maintainability (~30 min, no behavior change)

**C1. Deduplicate Atlas builder (P3)** — `atlas.functions.ts` has `getAtlas` and `buildAtlasInline` as near-duplicates. Extract the shared query batch into one private `loadAtlasData(supabase, coupleId)` and have both call it.

**C2. Replace `any` with generated types (Q1/Q2)** — Several spots cast `as any` for Supabase rows (e.g. `partnerResponse` shape, `profile.timezone`). Use `Database["public"]["Tables"][...]` types from `src/integrations/supabase/types.ts`.

**C3. Delete dead file (Q4)** — Remove the unused file flagged in the audit (will re-confirm path before deletion).

## Recommendation

Do **Group A** next in one batch — it removes the last real correctness and performance debt. Group B and C can ship whenever convenient. None of these require user input to start.
