
## Goal

Close the 5 error-level scanner findings (and the weak-randomness warning) that remain after the previous hardening pass. The earlier migration added triggers, but the scanners flag the underlying RLS policies / constraints directly — so we tighten the policies themselves and add a structural guarantee for daily_responses.

## Migration: tighten RLS + add constraints

1. **daily_responses — prevent duplicate submissions**
   - Add `UNIQUE (couple_id, user_id, prompt_date)` constraint.
   - This structurally blocks the "submit a second row to trip `daily_both_submitted`" bypass, independent of policy wording.

2. **app_events — scope inserts to caller's couple + event allowlist**
   - Drop `users insert own events`.
   - Recreate with `WITH CHECK (user_id = auth.uid() AND (couple_id IS NULL OR is_couple_member(couple_id)))`.
   - Keep the existing `app_events_event_whitelist` CHECK constraint from the prior migration (already blocks `payment.*`, `subscription.*`, `xp.*`, `admin.*`, `server.*`).

3. **letters — split update policies cleanly**
   - Drop any lingering `letters member update` policy.
   - Ensure only two update policies exist:
     - `letters author update`: `USING/CHECK (author_id = auth.uid() AND is_couple_member(couple_id))`.
     - `letters partner mark seen`: `USING (is_couple_member(couple_id) AND author_id <> auth.uid())` with `WITH CHECK` of the same. Column-level enforcement stays in the existing `letters_partner_only_seen_at` trigger (scanner cannot read triggers, but the policy now also blocks non-partners from touching the row at all).

4. **profiles / couples — block subscription_tier at the policy layer**
   - Revoke column UPDATE on `subscription_tier` from `authenticated`:
     - `REVOKE UPDATE (subscription_tier) ON public.profiles FROM authenticated;`
     - `REVOKE UPDATE (subscription_tier) ON public.couples FROM authenticated;`
   - Re-grant explicit UPDATE on the remaining writable columns to `authenticated` so the self-update policies still work for legitimate fields (display_name, avatar_url, etc. on profiles; name, anniversary_date, etc. on couples).
   - Keep the `prevent_subscription_tier_change` trigger as defense-in-depth.

5. **Invite codes — CSPRNG** (warning, easy win)
   - Update `generateInviteCode()` in `src/lib/xp.ts` to use `crypto.getRandomValues` instead of `Math.random()`. Edge-compatible.

## Out of scope

- The two `SECURITY DEFINER ... executable` linter warnings — these are intentional (`has_role`, `is_couple_member`, etc. are invoked by RLS policies; revoking EXECUTE breaks RLS). Will mark as ignored with explanation after migration.

## Verification

- Re-run `supabase--linter` and security scan.
- Smoke-test daily flow (insert one response → second insert by same user same date fails with unique violation).
- Confirm normal profile/couple updates still succeed for non-tier columns.

## Files

- New migration under `supabase/migrations/`.
- Edit `src/lib/xp.ts` (one function).
