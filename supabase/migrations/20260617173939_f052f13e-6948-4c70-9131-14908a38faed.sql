
-- Storage RLS: scope memory-media and exports to couple members via path prefix {couple_id}/...

CREATE POLICY "couple members read couple files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('memory-media', 'exports')
    AND public.is_couple_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "couple members upload couple files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('memory-media', 'exports')
    AND public.is_couple_member(((storage.foldername(name))[1])::uuid)
    AND owner = auth.uid()
  );

CREATE POLICY "couple members update couple files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('memory-media', 'exports')
    AND public.is_couple_member(((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id IN ('memory-media', 'exports')
    AND public.is_couple_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "couple members delete couple files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('memory-media', 'exports')
    AND public.is_couple_member(((storage.foldername(name))[1])::uuid)
  );
