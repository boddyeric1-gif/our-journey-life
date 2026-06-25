## Goal
Make `/sitemap.xml` self-update whenever routes are added, renamed, or removed — no manual edits to the entries array.

## Approach
Drive the sitemap from the generated route tree (`src/routeTree.gen.ts`) instead of a hand-maintained list. The TanStack Router Vite plugin regenerates that file on every build/dev run, so any new public route automatically flows into the sitemap.

### Changes

**1. `src/routes/sitemap[.]xml.ts` — rewrite to auto-derive entries**
- Import the `FileRoutesByTo` type from `@/routeTree.gen` and enumerate its keys at runtime via a small typed helper.
- Apply deny rules (no source edits needed when routes are added):
  - Skip anything containing `$` (dynamic params like `/join/$code`) — no way to enumerate values generically.
  - Skip anything starting with `/api/` (server endpoints, webhooks, health).
  - Skip `/sitemap.xml` itself.
  - Skip an explicit private set: `/home`, `/daily`, `/profile`, `/onboarding`, `/quests`, `/atlas`, `/premium`, `/admin`, `/capsule`, `/capsule/new`, `/checkout-return`, `/auth/confirm`. These mirror the `Disallow` list in `robots.txt` (authenticated app surface + post-action landings).
  - Strip trailing slashes and de-duplicate.
- Assign default `changefreq`/`priority` by simple rules: `/` → 1.0 weekly; `/resources/*` → 0.7 monthly; `/privacy`,`/terms` → 0.3 yearly; everything else → 0.5 monthly.
- Keep `BASE_URL = "https://our-journey.life"` and the existing XML/Response shape.

**2. `public/robots.txt` — no change needed**
Already disallows the private app routes and points at `/sitemap.xml`. Left as-is so the deny list stays human-editable in one obvious place. (The sitemap's private set mirrors it.)

### Result
Adding e.g. `src/routes/resources.love-languages.tsx` automatically:
- Generates `/resources/love-languages` in `routeTree.gen.ts` on next build.
- Appears in `/sitemap.xml` with `changefreq=monthly, priority=0.7`.
- No code edit to the sitemap file required.

Routes that should stay hidden only need to be added to the private set inside `sitemap[.]xml.ts` (and `robots.txt` if you want crawlers to skip them entirely).

### Technical notes
- `FileRoutesByTo` keys are the user-facing URL paths (already de-layouted, so `/_authenticated/home` appears as `/home`) — exactly what a sitemap needs.
- Reading keys off a `{} as FileRoutesByTo` object at runtime won't work (types are erased); instead import the generated `routeTree` value and walk `routeTree.routesByPath` (or equivalent runtime structure). If that internal isn't stable, fall back to importing the typed `FileRoutesByTo` and using a `satisfies` map populated by `Object.keys` of an inferred const — verified during implementation.
- Entirely runtime: no Vite config changes, no new dependencies, no build step.
