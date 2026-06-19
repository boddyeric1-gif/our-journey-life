
-- Tighten couples update: must already be a member
DROP POLICY IF EXISTS "couples member update" ON public.couples;
CREATE POLICY "couples member update" ON public.couples FOR UPDATE TO authenticated
  USING (public.is_couple_member(id)) WITH CHECK (public.is_couple_member(id));

-- Tighten invites: update only by creator or accepter
DROP POLICY IF EXISTS "invites update auth" ON public.invites;
CREATE POLICY "invites update by participant" ON public.invites FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = used_by OR used_by IS NULL)
  WITH CHECK (auth.uid() = created_by OR auth.uid() = used_by);

-- Revoke public/auth EXECUTE on internal SECURITY DEFINER helpers; they're only
-- referenced inside RLS policies and triggers, which run with the function owner.
REVOKE EXECUTE ON FUNCTION public.is_couple_member(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
