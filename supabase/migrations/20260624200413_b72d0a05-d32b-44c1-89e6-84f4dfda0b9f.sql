
CREATE POLICY "couple_members self delete"
ON public.couple_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
