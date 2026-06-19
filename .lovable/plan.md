
# Our Journey — App-Store-Ready Build Plan

A four-phase plan that takes the v2 codebase from the zip and lands it as a polished, testable, store-submittable couples app. Each phase ends in a verifiable state.

---

## Phase 1 — Import & foundation

Bring the v2 codebase into this project and make sure the rails are sound before any redesign.

- Import everything under `src/`, `supabase/`, `public/`, plus config files (`bunfig.toml`, `components.json`, `eslint.config.js`, `.prettierrc`). Skip `.lovable/plan.md` and any `.git` metadata.
- Reconcile `package.json` against the current template; install missing deps (`@hookform/resolvers`, `cmdk`, `embla-carousel-react`, `input-otp`, `date-fns`, `react-day-picker`, etc.) in one batch.
- Verify the bootstrap shell (`src/router.tsx`, `src/routes/__root.tsx`, `src/start.ts`) matches the current TanStack Start conventions; port the v2 root content into the template's shell.
- Re-run all Supabase migrations (14 files) on Lovable Cloud and confirm RLS, the `xp_events` unique index, and the couple/letters/quests tables are intact.
- Fix the two known carry-overs flagged in the v2 audit:
  - Extract duplicated streak logic from `home.functions.ts` + `quest.functions.ts` into `src/lib/streaks.server.ts`.
  - Resolve the `/auth` hydration mismatch (`<main>` vs `<Suspense>`).

**Exit:** clean build, all routes load, sign-in → onboarding → pair → home works end-to-end.

---

## Phase 2 — Soft Dusk design system & UX refinement

Apply the chosen Soft Dusk palette (`#1A1426 #3B2B4A #E8C9B0 #C98A7D`) as a real design system, then refine every screen.

**Tokens (`src/styles.css`)**
- `--background` deep plum, `--foreground` candlelight, `--primary` dusk rose, `--accent` lavender mist, all in `oklch`. Light + dark variants both tuned for the same mood.
- Type pair: `Cormorant Garamond` (display, headlines, prompts) + `Inter` (UI), loaded via `@fontsource` packages — no CDN `<link>`.
- Spacing, radius (`1.25rem` default), shadow, and motion tokens (`--ease-quiet`, `--duration-soft`) defined once and reused.
- Mobile-first with safe-area insets baked into `AppShell`.

**Screen-by-screen refinement**
- `auth`: single-action sign-in/up, gentle copy ("Begin the journey"), no double CTA.
- `onboarding`: name → timezone (auto) → invite or join, with a calm 3-step progress.
- `join/$code` + invite share: native share sheet (Web Share API now, Capacitor Share later), copy-link fallback, partner avatar preview.
- `home`: literary day card, streak ring (soft, not gamified), letters inbox inline, today's prompt status.
- `daily` (dual-reveal): seal animation, "waiting on partner" lock card with breathing pulse, realtime reveal via Supabase channel on `daily_responses` insert — replaces the manual refresh.
- `quests/$chapter`: chapter celebration as a quiet modal (no confetti), single-fire guaranteed by existing `alreadyCompleted` flag; "Next chapter" auto-opens the next unlocked chapter.
- `profile`: streak history, freezes left, signed-in identity, sign-out, danger-zone unpair.
- Empty + error + not-found states on every route with `errorComponent` + `notFoundComponent`.

**Motion**: soft fades, scale 0.98→1, no springs over 250ms, no confetti, no glassmorphism.

**Exit:** every screen reviewed at mobile viewport, design tokens used everywhere (zero hard-coded colors), Lighthouse mobile a11y ≥ 95.

---

## Phase 3 — Production hardening

- **Tests (Vitest)** for the load-bearing logic:
  - `xp.ts`: `localToday` across timezones, `daysBetween` across DST, streak transitions (+1, freeze, reset).
  - `home.functions.ts`: dual-reveal gating never leaks partner body before both seal.
  - `quest.functions.ts`: idempotent step complete, chapter-complete flag fires exactly once.
  - `couple.functions.ts`: invite code generation, join races, double-pair rejection.
- **Realtime**: Supabase channel subscription for the daily reveal + couple streak invalidation.
- **Observability**: route-level error boundaries already wired; add `reportLovableError` calls on server-fn catches, and a single `/api/public/health` route for uptime checks.
- **Security pass**: confirm `service_role` is only used inside `*.server.ts`, every public-schema table has explicit `GRANT`s, every server fn that mutates uses `requireSupabaseAuth`.
- **Performance**: `defaultPreloadStaleTime: 0` kept, queries scoped, letters list virtualized if > 50 entries.

**Exit:** `vitest run` green, no critical security findings, manual QA checklist passes on a real phone via the preview URL.

---

## Phase 4 — Capacitor packaging + store assets

- Add Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/share`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/app`). Web build stays the source of truth — Capacitor wraps `dist/`.
- `capacitor.config.ts` with app id `app.ourjourney.couple`, name "Our Journey", scheme `ourjourney`, server URL pointing to the published Lovable URL for hot-reload during dev and `dist/` for release.
- Deep links: `ourjourney://join/<code>` and Universal/App Links for `/join/$code` so invites open the app when installed.
- Native splash + icon generated from the Soft Dusk system (single 1024×1024 mark, candle-glow on plum). Adaptive icon for Android.
- Status bar styled to match background; safe-area handled in `AppShell`.
- Store assets written to `/mnt/documents/store/`:
  - App icon (1024 PNG), feature graphic (1024×500), 6 phone screenshots per platform, marketing copy (subtitle, description, keywords, what's new).
  - Privacy policy + terms as routes (`/privacy`, `/terms`) and as PDFs.
- Submission checklist (App Store Connect + Play Console) documented in `docs/submission.md`.

**Exit:** `npx cap sync ios && npx cap sync android` succeeds, the iOS and Android folders open and build in Xcode/Android Studio against the wrapped web bundle, and all store artifacts are downloadable.

---

## Technical details

- **Stack stays as the user's preferred:** React 19, TanStack Start, Supabase via Lovable Cloud, server functions for all writes, Capacitor only as the native shell.
- **No business-logic changes** to streak/XP/dual-reveal correctness — those were already audited green in v2; we only refactor for dedupe and add tests.
- **Routing:** preserve the `_authenticated` gated layout; add `/privacy`, `/terms`, `/_authenticated/letters` (deep link target, still rendered inline on home).
- **Fonts:** `@fontsource/cormorant-garamond`, `@fontsource/inter` imported in `src/start.ts` (server-safe).
- **Realtime:** single `useDailyRealtime(promptDate)` hook subscribing to `daily_responses` filtered by `couple_id`, invalidating the home + daily queries.
- **Capacitor build flow:** `bun run build` → `npx cap copy` → open native IDE. No Node-only deps reach the worker bundle.

---

## What I'll ask before each phase

I'll surface a short check-in at the end of Phase 1 (post-import sanity), Phase 2 (visual review on a real device), and Phase 4 (store metadata copy approval). Otherwise I'll execute straight through.
