
-- 1) Mark advanced chapters
ALTER TABLE public.quest_chapters
  ADD COLUMN IF NOT EXISTS is_advanced boolean NOT NULL DEFAULT false;

-- 2) Couple XP sum
CREATE OR REPLACE FUNCTION public.couple_total_xp(_couple_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.is_couple_member(_couple_id) THEN (
    SELECT COALESCE(SUM(xe.amount), 0)::bigint
    FROM public.xp_events xe
    JOIN public.couple_members cm ON cm.user_id = xe.user_id
    WHERE cm.couple_id = _couple_id
  ) ELSE 0::bigint END;
$$;

-- 3) Shared active days: dates where both members logged a daily response
--    or solo reflection (cannot be grinded — at most one per calendar day).
CREATE OR REPLACE FUNCTION public.couple_shared_days(_couple_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.is_couple_member(_couple_id) THEN (
    SELECT COUNT(*)::int FROM (
      SELECT d
      FROM (
        SELECT dr.user_id, dr.prompt_date AS d
        FROM public.daily_responses dr
        WHERE dr.couple_id = _couple_id
        UNION
        SELECT sr.user_id, sr.prompt_date AS d
        FROM public.solo_reflections sr
        JOIN public.couple_members cm ON cm.user_id = sr.user_id
        WHERE cm.couple_id = _couple_id
      ) u
      GROUP BY d
      HAVING COUNT(DISTINCT user_id) >= 2
    ) x
  ) ELSE 0 END;
$$;

-- 4) Dual-gate unlock: paid entitlement OR (level >= X AND shared_days >= Y)
CREATE OR REPLACE FUNCTION public.couple_unlocked(_couple_id uuid, _product text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req_level integer;
  req_days  integer;
  xp        bigint;
  shared    integer;
  lvl       integer;
BEGIN
  IF NOT public.is_couple_member(_couple_id) THEN
    RETURN FALSE;
  END IF;

  -- Paid path wins immediately.
  IF _product IN ('time_capsule','the_atlas')
     AND public.couple_has_entitlement(_couple_id, _product) THEN
    RETURN TRUE;
  END IF;

  -- Earned path thresholds.
  CASE _product
    WHEN 'quests_advanced' THEN req_level := 8;  req_days := 14;
    WHEN 'time_capsule'    THEN req_level := 11; req_days := 21;
    WHEN 'the_atlas'       THEN req_level := 15; req_days := 30;
    ELSE RETURN FALSE;
  END CASE;

  xp     := public.couple_total_xp(_couple_id);
  shared := public.couple_shared_days(_couple_id);
  lvl    := floor(sqrt(GREATEST(xp, 0) / 100.0))::int + 1;

  RETURN lvl >= req_level AND shared >= req_days;
END;
$$;

-- Lock down + grant to authenticated only.
REVOKE EXECUTE ON FUNCTION public.couple_total_xp(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.couple_shared_days(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.couple_unlocked(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.couple_total_xp(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.couple_shared_days(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.couple_unlocked(uuid, text) TO authenticated, service_role;
