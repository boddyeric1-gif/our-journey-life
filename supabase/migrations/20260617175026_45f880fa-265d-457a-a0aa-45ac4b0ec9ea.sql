DROP POLICY IF EXISTS "invites self insert" ON public.invites;
CREATE POLICY "invites self insert" ON public.invites
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_couple_member(couple_id));