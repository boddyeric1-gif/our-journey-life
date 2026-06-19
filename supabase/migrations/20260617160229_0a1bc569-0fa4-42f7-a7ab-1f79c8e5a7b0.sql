
-- Sprint 1+2: timezone-aware streaks, XP idempotency, dual-reveal RLS

-- 1) profiles.timezone for tz-correct streak math
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

-- 2) xp_events dedupe_key + unique index
ALTER TABLE public.xp_events
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE UNIQUE INDEX IF NOT EXISTS xp_events_user_kind_dedupe_uidx
  ON public.xp_events (user_id, kind, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- 3) Dual-reveal: SECURITY DEFINER helper that returns true only when both
--    members of a couple have submitted a response for the given prompt_date.
CREATE OR REPLACE FUNCTION public.daily_both_submitted(_couple_id uuid, _prompt_date date)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT count(DISTINCT user_id)
    FROM public.daily_responses
    WHERE couple_id = _couple_id AND prompt_date = _prompt_date
  ) >= 2;
$$;

-- Replace responses SELECT policy: own row always; partner row only after both submitted.
DROP POLICY IF EXISTS "responses member select" ON public.daily_responses;
CREATE POLICY "responses self or revealed"
  ON public.daily_responses
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      is_couple_member(couple_id)
      AND public.daily_both_submitted(couple_id, prompt_date)
    )
  );

-- 4) Helpful indexes for hot paths
CREATE INDEX IF NOT EXISTS daily_responses_couple_date_idx
  ON public.daily_responses (couple_id, prompt_date);
CREATE INDEX IF NOT EXISTS letters_couple_created_idx
  ON public.letters (couple_id, created_at DESC);
CREATE INDEX IF NOT EXISTS xp_events_user_created_idx
  ON public.xp_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS xp_events_user_kind_idx
  ON public.xp_events (user_id, kind);

-- 5) Grants (additive; helper function execute)
GRANT EXECUTE ON FUNCTION public.daily_both_submitted(uuid, date) TO authenticated, service_role;
