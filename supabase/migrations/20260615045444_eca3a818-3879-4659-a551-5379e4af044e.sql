
GRANT EXECUTE ON FUNCTION public.is_couple_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shares_couple_with(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
