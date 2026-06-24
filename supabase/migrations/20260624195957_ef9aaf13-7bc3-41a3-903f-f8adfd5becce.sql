
-- Trigger-only: nobody should call these directly
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_subscription_tier_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.letters_partner_only_seen_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- RLS helpers: revoke from anon and PUBLIC; signed-in users still need EXECUTE
-- because Postgres evaluates these in the caller's session when the policy fires.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_couple_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.shares_couple_with(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.daily_both_submitted(uuid, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.couple_has_entitlement(uuid, text) FROM PUBLIC, anon;
