
-- Helper: do auth.uid() and _other share any couple?
CREATE OR REPLACE FUNCTION public.shares_couple_with(_other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.couple_members cm1
    JOIN public.couple_members cm2 ON cm1.couple_id = cm2.couple_id
    WHERE cm1.user_id = auth.uid() AND cm2.user_id = _other
  );
$$;

-- profiles: self or partner only
DROP POLICY IF EXISTS "profiles self select" ON public.profiles;
CREATE POLICY "profiles self or partner select" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.shares_couple_with(id));

-- invites: SELECT only by creator or claimer (lookups by code happen server-side via service role)
DROP POLICY IF EXISTS "invites select all auth" ON public.invites;
CREATE POLICY "invites select participant" ON public.invites
FOR SELECT TO authenticated
USING (auth.uid() = created_by OR auth.uid() = used_by);

-- invites: UPDATE only by creator (claim flow runs via service role)
DROP POLICY IF EXISTS "invites update by participant" ON public.invites;
CREATE POLICY "invites update by creator" ON public.invites
FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- xp_events: no direct client INSERT (all awarded via server-side service role)
DROP POLICY IF EXISTS "xp self insert" ON public.xp_events;
REVOKE INSERT, UPDATE, DELETE ON public.xp_events FROM authenticated;
GRANT SELECT ON public.xp_events TO authenticated;

-- user_streaks: client may read self; mutations only via server-side service role
DROP POLICY IF EXISTS "streaks self all" ON public.user_streaks;
CREATE POLICY "streaks self select" ON public.user_streaks
FOR SELECT TO authenticated
USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.user_streaks FROM authenticated;
GRANT SELECT ON public.user_streaks TO authenticated;

-- couple_streaks: same hardening — read by members, writes server-side
REVOKE INSERT, UPDATE, DELETE ON public.couple_streaks FROM authenticated;
GRANT SELECT ON public.couple_streaks TO authenticated;
