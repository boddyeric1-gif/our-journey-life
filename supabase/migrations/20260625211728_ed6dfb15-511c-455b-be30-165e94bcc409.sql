CREATE OR REPLACE FUNCTION public.couple_shared_days(_couple_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      HAVING COUNT(DISTINCT user_id) >= LEAST(
        2,
        (SELECT COUNT(*) FROM public.couple_members WHERE couple_id = _couple_id)
      )
    ) x
  ) ELSE 0 END;
$function$;