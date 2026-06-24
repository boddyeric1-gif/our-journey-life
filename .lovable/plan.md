## Goal

Let you test every premium feature without paying, by promoting your account (`emb.creations.llc@gmail.com`) to an admin and giving any couple containing an admin full unlock access. Add a small hidden `/admin` page so you can manage roles and inspect couples going forward.

## How the bypass works

All premium gates already flow through one database function: `public.couple_unlocked(couple_id, product)`. It's called from `quest.functions.ts`, `timeCapsule.functions.ts`, and `atlas.functions.ts`. Extending it is a one-line change that unlocks Time Capsule, The Atlas, and advanced quests everywhere at once — no scattering of bypass logic across the app.

Bypass rule: if **any member of the couple** has the `admin` role, every product returns `unlocked = true`. So when you pair with a test partner (or your real partner), that couple sees the full premium experience.

## Migration (single file)

1. Grant `admin` role to your user:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   SELECT id, 'admin' FROM auth.users WHERE email = 'emb.creations.llc@gmail.com'
   ON CONFLICT (user_id, role) DO NOTHING;
   ```
2. Add helper `public.couple_has_admin(_couple_id uuid)` — `SECURITY DEFINER`, `STABLE`, joins `couple_members` → `user_roles`, scoped via `is_couple_member` so it isn't a data leak. `REVOKE ... FROM anon`, `GRANT ... TO authenticated, service_role`.
3. Patch `public.couple_unlocked` to short-circuit `RETURN TRUE` when `couple_has_admin(_couple_id)` — placed right after the existing paid-entitlement short-circuit so admin works for couples with no paid record.
4. Add RLS to `user_roles`: admins can SELECT/INSERT/DELETE all rows (`USING (has_role(auth.uid(), 'admin'))`). Existing self-read policy stays.

## Hidden `/admin` page

New protected route `src/routes/_authenticated/admin.tsx`. Guard with a `beforeLoad` that calls a new server fn `requireAdmin()` (uses `requireSupabaseAuth` + `has_role` RPC) and throws `redirect({ to: '/' })` for non-admins. Not linked from any nav — you reach it by typing the URL.

Page contents (kept minimal, brand-aligned):
- **You** card: your email, user id, admin badge, your couple id, current `couple_unlocked` status for each product (sanity check the bypass).
- **Admins** list: rows of `{ email, user_id, granted_at }` with a "Revoke" button. A small input + "Grant admin" button (looks up user by email server-side).
- **Lookup couple** input: paste a couple id → shows members, XP, shared days, entitlements, and unlock status per product.

Server functions in `src/lib/admin.functions.ts` (all `requireSupabaseAuth` + admin check inside the handler):
- `getAdminOverview()` — your row + admin list.
- `grantAdminByEmail({ email })` — loads `supabaseAdmin` inside the handler (Auth Admin lookup by email), inserts into `user_roles`.
- `revokeAdmin({ user_id })` — deletes role; refuses to revoke the last admin.
- `inspectCouple({ couple_id })` — returns members, RPC results.

## UI rules

Card-based layout matching the rest of the app, mobile-first, no neon, no glassmorphism, no confetti. Destructive actions (revoke) use the existing `AlertDialog` confirm.

## Out of scope

- No billing/Stripe changes — paid checkout still works untouched.
- No "developer mode" toggle, no impersonation, no fake-XP buttons.
- No public signup of admins; only existing admins can grant.
- No analytics events for admin actions (can add later if you want an audit log).

## Verification

- `tsgo --noEmit` clean.
- SQL: as your user, call `select couple_unlocked('<your couple id>', 'the_atlas')` → `true`. As a non-admin test user in a separate couple → `false` unless they hit the existing XP/days thresholds or have a paid entitlement.
- Visit `/admin` signed in as you → loads. Sign out and visit → redirected.
- Open Time Capsule, Atlas, and an advanced quest chapter from your account → no paywall.
