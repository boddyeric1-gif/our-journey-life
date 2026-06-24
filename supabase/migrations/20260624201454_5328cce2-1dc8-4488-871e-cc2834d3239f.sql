-- Repair: the GF (sararutecky1001) completed onboarding and reached the invite-share step,
-- but a silent profile UPDATE failure (PostgREST PATCH returning 0-rows-affected through
-- the user's RLS-scoped client) left onboarded_at = NULL, which made /home bounce her
-- back to /onboarding at step 0 every time she clicked "Enter Our Journey". Mark her
-- onboarded so she can enter the app; the code path is now hardened to throw on this
-- failure instead of silently swallowing it.
UPDATE public.profiles
SET onboarded_at = now()
WHERE id = 'bea86cc5-b3d5-410f-8fee-7bfa573dd11f'
  AND onboarded_at IS NULL
  AND current_couple_id IS NOT NULL;