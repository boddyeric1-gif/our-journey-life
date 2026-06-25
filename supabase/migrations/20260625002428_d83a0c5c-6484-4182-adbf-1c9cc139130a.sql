
-- Harden daily_both_submitted: only members (or service_role) get a real answer
CREATE OR REPLACE FUNCTION public.daily_both_submitted(_couple_id uuid, _prompt_date date)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_service boolean := (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR (auth.jwt() ->> 'role') = 'service_role'
  );
BEGIN
  IF NOT is_service AND NOT public.is_couple_member(_couple_id) THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT count(DISTINCT user_id)
    FROM public.daily_responses
    WHERE couple_id = _couple_id AND prompt_date = _prompt_date
  ) >= 2;
END;
$function$;

-- Harden couple_has_entitlement: do not leak paid-product status across couples
CREATE OR REPLACE FUNCTION public.couple_has_entitlement(_couple_id uuid, _product text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_service boolean := (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR (auth.jwt() ->> 'role') = 'service_role'
  );
BEGIN
  IF NOT is_service AND NOT public.is_couple_member(_couple_id) THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.couple_entitlements
    WHERE couple_id = _couple_id
      AND product = _product
      AND status = 'active'
  );
END;
$function$;

-- Harden couple_has_admin: do not leak whether another couple includes an admin
CREATE OR REPLACE FUNCTION public.couple_has_admin(_couple_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_service boolean := (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR (auth.jwt() ->> 'role') = 'service_role'
  );
BEGIN
  IF NOT is_service AND NOT public.is_couple_member(_couple_id) THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.couple_members cm
    JOIN public.user_roles ur ON ur.user_id = cm.user_id
    WHERE cm.couple_id = _couple_id
      AND ur.role = 'admin'
  );
END;
$function$;
