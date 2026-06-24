# Couple Level Unlocks (v2 — anti-grind)

Turn XP into a shared progression that unlocks premium features. Paid entitlements keep working unchanged — reaching a milestone is an *alternative* way in, earned by ~a month of consistent shared use, not a 5-minute quest grind.

## Anti-grind: dual gate

A single XP threshold is grindable because quest steps award up to 240 couple XP each, so a couple could blow past a level in one sitting. To prevent that, every unlock requires **two conditions simultaneously**:

1. **Couple level ≥ milestone** (XP-based, can spike from quests)
2. **Shared active days ≥ minimum** (calendar-bound, cannot be grinded — at most one per day, and only when **both partners** logged a daily response or solo reflection that day)

Shared days come from counting dates where `couple_both_active_on(couple_id, date) = true` — that RPC already exists. One row of progress per real calendar day, per couple. No amount of quest-grinding moves this number.

## Milestones (raised by 5, with shared-day floors)

```text
Feature                Level   Couple XP    Shared Days
Advanced quests          8       4,900          14
Time Capsule            11      10,000          21
The Atlas               15      19,600          30
```

Why these survive a quest binge: even if a couple completes every quest step on day 1, the shared-days floor still forces ~2 weeks before the first unlock and a full month before The Atlas. The XP floor stops a couple who *only* opens the app at midnight to mark "active" from coasting in without doing the work.

## Realistic pacing (sanity check)

Sustainable daily couple XP without quests:
- Daily prompt: 100 (50 each)
- Solo reflections: ~60
- Letters / insights: ~30 typical
- **≈ 180–200 couple XP/day** baseline

Cumulative (no quests):
- Day 14 → ~2,700 XP (Level 6) + 14 shared days → still locked
- Day 21 → ~4,100 XP (Level 7) + 21 shared days → still locked
- Day 30 → ~5,800 XP (Level 8) + 30 shared days → Advanced quests unlocked, Time Capsule close
- Quests, when done together, accelerate XP but cannot accelerate shared days, so they shorten the gap **only after** the floor is met

A motivated couple completes everything in ~5–7 weeks. A grinder cannot shortcut it.

## Model

Re-use `levelFromXp()` so curve, UI, and tests don't change — only the input does.

`couple_total_xp(_couple_id)` = `SUM(xp_events.amount)` joined to `couple_members` for that couple.

`couple_shared_days(_couple_id)` = `COUNT(DISTINCT date)` from `daily_responses` ∪ `solo_reflections` where both partners are present on the same date (mirrors `couple_both_active_on` aggregated, executed in one query).

Unlock check:
```text
unlocked(feature) ⇔
  couple_total_xp >= XP_FLOOR[feature]
  AND couple_shared_days >= DAYS_FLOOR[feature]
  OR couple_has_entitlement(couple, product)  -- paid path
```

## Database

```sql
ALTER TABLE public.quest_chapters
  ADD COLUMN IF NOT EXISTS is_advanced boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.couple_total_xp(_couple_id uuid) RETURNS bigint ...;
CREATE OR REPLACE FUNCTION public.couple_shared_days(_couple_id uuid) RETURNS integer ...;

-- Extend existing entitlement check with the dual-gate fallback
CREATE OR REPLACE FUNCTION public.couple_has_entitlement(_couple_id uuid, _product text) ...;
```

Both new functions: `SECURITY DEFINER`, `STABLE`, guarded by `is_couple_member`. `GRANT EXECUTE ... TO authenticated`. No schema breaks. Existing RLS policies and server gates keep working unchanged because they all already route through `couple_has_entitlement`.

## Server

`src/lib/coupleLevel.ts` (shared, pure):

```ts
export const UNLOCKS = {
  quests_advanced: { level: 8,  sharedDays: 14 },
  time_capsule:    { level: 11, sharedDays: 21 },
  the_atlas:       { level: 15, sharedDays: 30 },
} as const;
export function isUnlocked(level: number, sharedDays: number, k: keyof typeof UNLOCKS) { ... }
```

`home.functions.ts` `getHome()` payload gains:

```ts
couple: {
  totalXp, level, intoLevel, span, percent,
  sharedDays,
  unlocks: { time_capsule, the_atlas, quests_advanced },
  nextUnlock: { feature, xpRemaining, daysRemaining } | null,  // null when all unlocked or paid
}
```

Gates remain server-side. `timeCapsule.functions.ts` and `atlas.functions.ts` keep their `couple_has_entitlement` call. `quest.functions.ts` adds an `unlocked(quests_advanced)` check when a step belongs to an advanced chapter.

## UI

- **Home**: shared "Together — Level N" bar replaces the per-user bar. Below it, the *next unlock* chip shows whichever floor is further away: `"Time Capsule unlocks at Level 11 · 8 shared days to go"`.
- **Profile**: small "Both of you" panel listing the three milestones with two tick marks each (level ✓, days ✓), so couples see why a feature is still locked.
- **Paywall surfaces** (Time Capsule / Atlas locked state): two paths side by side — "Earn it together" (progress: level + days) and "Unlock now" (existing checkout). Honest, no pressure.
- **Quests list**: advanced chapters show a quiet "Level 8 · 14 shared days" badge until unlocked.

No new routes. No new colors. No confetti.

## Out of scope

- No change to per-user XP accrual.
- No change to streaks, payments, or webhooks.
- No analytics events this pass.
- No retroactive notification when an existing couple already meets a milestone — they simply see the feature unlocked next time they open it.

## Verification

- `tsgo --noEmit` after each step.
- SQL: seed a couple with 30,000 XP but only 3 shared days → Atlas still locked. Seed a couple with 30 shared days but 1,000 XP → still locked. Both met → unlocked.
- Vitest: `isUnlocked` truth table; `getHome` payload shape with mocked RPCs.
- Manual: locked Time Capsule renders both paths; after enough XP + days, the composer renders without purchase.
