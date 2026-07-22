
-- 1) Trial start timestamps on profiles (one-time, per account)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS atlas_trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS timecapsule_trial_started_at timestamptz;

-- 2) Permanent trial usage record keyed by email hash (survives account deletion)
CREATE TABLE IF NOT EXISTS public.feature_trial_usage (
  email_hash text NOT NULL,
  product text NOT NULL CHECK (product IN ('the_atlas','time_capsule')),
  used_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email_hash, product)
);

-- Server-only (webhooks/admin/server fns). No client access at all.
GRANT ALL ON public.feature_trial_usage TO service_role;
ALTER TABLE public.feature_trial_usage ENABLE ROW LEVEL SECURITY;
-- No policies → authenticated/anon have zero access.

-- 3) Helper: does any couple member currently have an active trial for this product?
CREATE OR REPLACE FUNCTION public.couple_has_trial(_couple_id uuid, _product text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service boolean := (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR (auth.jwt() ->> 'role') = 'service_role'
  );
  cnt int := 0;
BEGIN
  IF NOT is_service AND NOT public.is_couple_member(_couple_id) THEN
    RETURN FALSE;
  END IF;

  IF _product = 'the_atlas' THEN
    SELECT COUNT(*) INTO cnt
    FROM public.couple_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.couple_id = _couple_id
      AND p.atlas_trial_started_at IS NOT NULL
      AND p.atlas_trial_started_at > now() - interval '7 days';
  ELSIF _product = 'time_capsule' THEN
    SELECT COUNT(*) INTO cnt
    FROM public.couple_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.couple_id = _couple_id
      AND p.timecapsule_trial_started_at IS NOT NULL
      AND p.timecapsule_trial_started_at > now() - interval '7 days';
  END IF;

  RETURN cnt > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.couple_has_trial(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.couple_has_trial(uuid, text) TO authenticated, service_role;

-- 4) Extend couple_unlocked so an active trial counts as unlocked.
CREATE OR REPLACE FUNCTION public.couple_unlocked(_couple_id uuid, _product text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Admin bypass
  IF public.couple_has_admin(_couple_id) THEN
    RETURN TRUE;
  END IF;

  -- Paid entitlement
  IF _product IN ('time_capsule','the_atlas')
     AND public.couple_has_entitlement(_couple_id, _product) THEN
    RETURN TRUE;
  END IF;

  -- Active free trial (per-user, either partner qualifies)
  IF _product IN ('time_capsule','the_atlas')
     AND public.couple_has_trial(_couple_id, _product) THEN
    RETURN TRUE;
  END IF;

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
$function$;
