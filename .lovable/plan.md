
# Fix: admin role not granted to new account

## What happened

The earlier admin migration ran a `SELECT id FROM auth.users WHERE email = 'emb.creations.llc@gmail.com'` at the moment it executed — and the account didn't exist yet, so zero rows were inserted into `user_roles`. I verified: that user now exists (id `b25f590e-…`) but has no admin row. That's why premium features still show as locked.

The couple is fine (the user is in one couple), so as soon as the admin row exists, `couple_has_admin` returns true and `couple_unlocked` short-circuits to true for all products.

## Fix (two parts)

### 1. Insert the missing admin row now

A one-row `INSERT` into `public.user_roles` for that user_id with role `admin`. Uses the data-insert path, not a schema migration.

### 2. Make it self-healing for future signups

Update the existing `public.handle_new_user()` function (already triggered on `auth.users` insert) to also insert an admin role row whenever a new account is created with `emb.creations.llc@gmail.com`. This is purely a function body change in the `public` schema — no new triggers, no edits to `auth`.

That way if you ever delete and re-create the admin account, or sign up on a fresh device/email-change flow, the role is granted automatically.

## After the fix

You'll need to sign out and back in once so the client re-fetches the unlock state. After that, `/admin` will recognize you as admin and all premium gates (Advanced Chapters, Time Capsule, Atlas) unlock for your couple.

## Out of scope

- No changes to RLS, `couple_unlocked`, `couple_has_admin`, or the `/admin` page.
- No new admins added — only the one email you already specified.
- Hydration warning visible in console (from `/auth`) is unrelated and not addressed here.
