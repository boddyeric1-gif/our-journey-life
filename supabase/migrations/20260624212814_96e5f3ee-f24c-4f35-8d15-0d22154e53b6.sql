-- Returns true when every member of the couple has either a daily response
-- or a solo reflection on the given date. Replaces 4 sequential queries in
-- the couple-streak path with one.
CREATE OR REPLACE FUNCTION public.couple_both_active_on(_couple_id uuid, _date date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
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
  );
$$;

GRANT EXECUTE ON FUNCTION public.couple_both_active_on(uuid, date) TO authenticated, service_role;

-- Atomically replace a couple's goals. Caller must be a member.
CREATE OR REPLACE FUNCTION public.replace_couple_goals(_couple_id uuid, _goals text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_couple_member(_couple_id) THEN
    RAISE EXCEPTION 'Not a member of this couple';
  END IF;

  DELETE FROM public.couple_goals WHERE couple_id = _couple_id;

  IF _goals IS NOT NULL AND array_length(_goals, 1) IS NOT NULL THEN
    INSERT INTO public.couple_goals (couple_id, goal)
    SELECT _couple_id, g
    FROM unnest(_goals) AS g
    WHERE length(btrim(g)) > 0
    ON CONFLICT (couple_id, goal) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_couple_goals(uuid, text[]) TO authenticated, service_role;