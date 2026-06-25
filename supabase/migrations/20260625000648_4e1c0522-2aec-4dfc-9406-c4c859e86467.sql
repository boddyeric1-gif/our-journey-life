CREATE OR REPLACE FUNCTION public.couple_both_active_on(_couple_id uuid, _date date)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
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
  );
END;
$function$;