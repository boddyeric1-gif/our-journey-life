
REVOKE EXECUTE ON FUNCTION public.shares_couple_with(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shares_couple_with(uuid) TO authenticated;
