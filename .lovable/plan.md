
# Polish + maintainability batch

Group A (medium-impact) already shipped. This batch closes the remaining six items in `.lovable/plan.md` — three polish fixes the user sees, three maintainability cleanups with zero behavior change. Small, independent, low risk.

## Group B — Polish

**B1. Goals click feedback** — In the onboarding/profile goals editor, clicking a 4th goal currently does nothing. Add a transient "Up to three" hint (small muted line under the chip grid) that appears on the rejected click and fades after ~1.6s. Local component state, no schema change.

**B2. Profile loading skeleton** — Replace the raw `<div>Loading…</div>` fallback in `src/routes/_authenticated/profile.tsx` with the existing `HeaderSkeleton` so loading state matches the rest of the app.

**B3. OG images for shareable routes** — Add `og:image` + `twitter:image` to:
- `/` (`src/routes/index.tsx`) — site cover
- `/join/$code` (`src/routes/join.$code.tsx`) — same cover (invite preview)

Generate one warm, literary brand cover (1200×630) at `src/assets/og-cover.jpg` and import as a URL. Wire absolute URLs (`https://our-journey.life/...`) per head-meta rules. Note to user: existing link-preview caches won't refresh until each platform re-scrapes.

## Group C — Maintainability (no behavior change)

**C1. Deduplicate Atlas builder** — In `src/lib/atlas.functions.ts`, extract the shared query batch from `getAtlas` and `buildAtlasInline` into one private `loadAtlasData(supabase, coupleId)` helper. Both functions become thin wrappers.

**C2. Replace `any` with generated DB types** — Sweep `src/lib/home.functions.ts`, `quest.functions.ts`, `atlas.functions.ts`, `timeCapsule.functions.ts` for `as any` casts on Supabase rows. Replace with `Database["public"]["Tables"][...]["Row"]` (or `Functions[...]["Returns"]` for RPCs) from `src/integrations/supabase/types.ts`.

**C3. Delete dead file** — Re-grep for unreferenced files flagged in the original audit (the candidate was a stale helper under `src/lib/`). Confirm zero imports via `rg`, then delete. If nothing is actually dead, skip and note it.

## Verification

- `tsgo --noEmit` after each group.
- Manually click 4 goals to confirm the B1 hint.
- View `/` and `/join/<test>` head tags to confirm absolute `og:image` URLs.
- Atlas page still renders identical content after C1.

## Out of scope

No new features, no DB migrations, no auth changes. Group A items remain as shipped.
