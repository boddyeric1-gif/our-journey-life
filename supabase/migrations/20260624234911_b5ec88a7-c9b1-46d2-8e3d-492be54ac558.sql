-- Add UPDATE policy on storage.objects for the time-capsules bucket.
-- Restrict updates to the object owner (uploader) AND only when that user is
-- still a member of the couple whose id prefixes the object path
-- (paths are `${coupleId}/${capsuleId}.${ext}` — see createTimeCapsule).
DROP POLICY IF EXISTS "time_capsules update own in couple" ON storage.objects;
CREATE POLICY "time_capsules update own in couple"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'time-capsules'
    AND owner = auth.uid()
    AND public.is_couple_member(((string_to_array(name, '/'))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'time-capsules'
    AND owner = auth.uid()
    AND public.is_couple_member(((string_to_array(name, '/'))[1])::uuid)
  );
