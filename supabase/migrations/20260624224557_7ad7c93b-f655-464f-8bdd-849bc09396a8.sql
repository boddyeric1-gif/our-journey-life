DROP POLICY IF EXISTS "Authors update own sealed capsules" ON public.time_capsules;

CREATE POLICY "Authors update own sealed capsules"
ON public.time_capsules
FOR UPDATE
TO authenticated
USING (author_id = auth.uid() AND unlock_at > now())
WITH CHECK (
  author_id = auth.uid()
  AND unlock_at > now()
  AND public.is_couple_member(couple_id)
);