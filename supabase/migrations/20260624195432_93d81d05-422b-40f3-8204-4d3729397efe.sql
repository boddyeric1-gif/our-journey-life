
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  display_name,
  avatar_url,
  relationship_stage,
  anniversary,
  love_language,
  onboarded_at,
  current_couple_id,
  timezone,
  journey_intention,
  updated_at
) ON public.profiles TO authenticated;

REVOKE UPDATE ON public.couples FROM authenticated;
GRANT UPDATE (
  bond_name,
  status,
  paired_at,
  anniversary_date
) ON public.couples TO authenticated;
