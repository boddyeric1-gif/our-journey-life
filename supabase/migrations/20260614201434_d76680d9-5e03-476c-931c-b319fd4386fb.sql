
DROP POLICY IF EXISTS "couples self insert" ON public.couples;
CREATE POLICY "couples auth insert" ON public.couples FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
