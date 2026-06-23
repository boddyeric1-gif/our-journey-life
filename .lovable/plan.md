## Finish deferred polish items

Five items remain from the audit. Plan below.

### 1. One-step-at-a-time chapter UX
In `src/routes/_authenticated/quests.$chapter.tsx`, stop rendering all four steps stacked. Show only the first incomplete step expanded; render completed steps as collapsed "done" rows above it, and upcoming steps as locked, muted rows below. Auto-scroll to the active step on completion. Keeps the literary, single-focus feel.

### 2. Partner-confirm logic for Together steps
Today, either partner can mark a Together step complete unilaterally. Change to require both partners to signal "done on my side":
- Reuse `quest_step_completions` (already per-user). For steps where `quest_steps.kind = 'together'`, the chapter is only considered complete for that step when both `couple_members` have a completion row.
- UI: button label becomes "Mark done on my side". Show partner state ("Waiting on Alex" / "Alex marked this done"). Step only collapses + advances when both rows exist.
- Realtime: subscribe to `quest_step_completions` for the couple so the second partner sees the unlock without refresh.
- No schema change needed; all logic lives in `quest.functions.ts` + the chapter route.

### 3. 48h auto-unseal for Daily
Right now if one partner never submits, the other is stuck behind the seal forever. Add a graceful escape:
- Server fn `getHomeState` / daily reveal logic: if `prompt_date` is ≥ 48h old and the current user has submitted, treat as revealed even when partner hasn't. Surface a small note: "Auto-opened — Alex didn't get to this one."
- Pure read-side change; no migration. Realtime hook already handles updates.

### 4. Onboarding love-language reframe
In `src/routes/_authenticated/onboarding.tsx` step 4: change copy from "Pick your love language" (definitive) to "Which one do you reach for first?" with subhead "You'll likely move between these. This is just a starting point." Allow same single-select underneath; no data shape change.

### 5. Surface goals
Goals chosen at onboarding (`couple_goals`) currently vanish. Surface them in two places:
- Profile page: small "What you're working on together" card listing the goals, with an inline "Edit" affordance that opens a lightweight editor (reuses onboarding goal chips).
- Home: subtle one-liner under the greeting on weeks 1–4 only ("Working on: deeper conversations · shared rituals") so it feels like the app remembers.

### Out of scope
No new features, no schema migrations, no visual redesign. Pure polish + correctness on existing surfaces.

### Files expected to change
- `src/routes/_authenticated/quests.$chapter.tsx` (items 1, 2)
- `src/lib/quest.functions.ts` (item 2 partner-confirm read shape)
- `src/hooks/use-quest-realtime.ts` *(new, small)* — or extend existing realtime hook for item 2
- `src/lib/daily.functions.ts` / wherever `getHomeState` lives (item 3)
- `src/components/today-hero.tsx` (item 3 auto-open note)
- `src/routes/_authenticated/onboarding.tsx` (item 4)
- `src/routes/_authenticated/profile.tsx` (item 5 goals card)
- `src/components/level-header.tsx` or `home.tsx` (item 5 home line)
