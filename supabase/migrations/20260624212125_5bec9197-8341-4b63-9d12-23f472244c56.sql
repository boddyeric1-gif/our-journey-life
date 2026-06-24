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
$$;

GRANT EXECUTE ON FUNCTION public.user_total_xp(uuid) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS xp_events_user_id_idx ON public.xp_events(user_id);