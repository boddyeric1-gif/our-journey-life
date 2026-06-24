CREATE OR REPLACE FUNCTION public.user_total_xp(_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::bigint
  FROM public.xp_events
  WHERE user_id = _user_id
    AND _user_id = auth.uid()
$$;