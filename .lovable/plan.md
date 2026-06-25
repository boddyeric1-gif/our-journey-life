## Fix: gate `couple_both_active_on` to couple members only

The `public.couple_both_active_on(uuid, date)` RPC is `SECURITY DEFINER` and granted to `authenticated`, but has no membership guard. It reads `solo_reflections` (whose presence-on-a-day is private by design) and returns a boolean — so any signed-in user can probe any `couple_id` and learn whether both members were active that day.

### Change

Single migration that recreates the function with a membership guard at the top, preserving signature and behavior for legitimate callers:

```sql
CREATE OR REPLACE FUNCTION public.couple_both_active_on(_couple_id uuid, _date date)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT CASE
    WHEN NOT public.is_couple_member(_couple_id) THEN NULL
    ELSE (
      NOT EXISTS (
        SELECT 1
        FROM public.couple_members cm
        WHERE cm.couple_id = _couple_id
          AND NOT EXISTS (
            SELECT 1 FROM public.daily_responses dr
            WHERE dr.user_id = cm.user_id
              AND dr.couple_id = _couple_id
              AND dr.prompt_date = _date
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.solo_reflections sr
            WHERE sr.user_id = cm.user_id
              AND sr.prompt_date = _date
          )
      ) AND EXISTS (
        SELECT 1 FROM public.couple_members WHERE couple_id = _couple_id
      )
    )
  END;
$function$;
```

Non-members get `NULL` instead of a boolean — probing leaks nothing. Members keep exactly the previous semantics.

### Caller compatibility

I'll grep for callers of `couple_both_active_on` first. Two expected call sites:
- `maybeAdvanceCoupleStreak` on the server uses `supabaseAdmin`, which is `service_role` and always satisfies the guard via the service role bypass path (`is_couple_member` returns true under service_role? No — it checks `auth.uid()`. Service role has no `auth.uid()`, so it would return false). To keep server-side advancement working, the guard needs to allow service_role explicitly:

```sql
WHEN current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role'
     AND NOT public.is_couple_member(_couple_id) THEN NULL
```

That mirrors the pattern already used in `prevent_subscription_tier_change`.

- Any client-side RPC call from `_authenticated` routes (if present) is by a couple member and continues to work.

### After the migration

Mark the finding as fixed via `manage_security_finding` with an explanation pointing at the migration.

### Out of scope

No table changes, no policy changes, no other RPCs touched.
