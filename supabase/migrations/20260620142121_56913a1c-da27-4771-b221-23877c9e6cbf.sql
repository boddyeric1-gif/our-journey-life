
-- 1) daily_responses: structural uniqueness per user/couple/date
ALTER TABLE public.daily_responses
  ADD CONSTRAINT daily_responses_user_couple_date_unique
  UNIQUE (couple_id, user_id, prompt_date);

-- 2) app_events: scope inserts to caller's couple
DROP POLICY IF EXISTS "users insert own events" ON public.app_events;
CREATE POLICY "users insert own events"
  ON public.app_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (couple_id IS NULL OR public.is_couple_member(couple_id))
  );

-- 3) profiles: prevent self-upgrade of subscription_tier via column-level grants
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  display_name, avatar_url, relationship_stage, anniversary,
  love_language, onboarded_at, current_couple_id, timezone, updated_at
) ON public.profiles TO authenticated;

-- 4) couples: same treatment
REVOKE UPDATE ON public.couples FROM authenticated;
GRANT UPDATE (
  bond_name, status, paired_at, anniversary_date
) ON public.couples TO authenticated;
