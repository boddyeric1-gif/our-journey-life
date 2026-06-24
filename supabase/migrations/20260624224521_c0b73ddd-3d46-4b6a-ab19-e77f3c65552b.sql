CREATE POLICY "Couple members read unlocked capsule audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'time-capsules'
  AND public.is_couple_member(((storage.foldername(name))[1])::uuid)
  AND EXISTS (
    SELECT 1 FROM public.time_capsules tc
    WHERE tc.audio_path = storage.objects.name
      AND tc.unlock_at <= now()
  )
);