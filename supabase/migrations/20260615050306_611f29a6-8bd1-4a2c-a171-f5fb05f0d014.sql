
DROP POLICY IF EXISTS "couple_members self insert" ON public.couple_members;
DROP POLICY IF EXISTS "couple_members self delete" ON public.couple_members;

DROP POLICY IF EXISTS "couple streaks member all" ON public.couple_streaks;
CREATE POLICY "couple streaks member select"
  ON public.couple_streaks FOR SELECT
  TO authenticated
  USING (public.is_couple_member(couple_id));
