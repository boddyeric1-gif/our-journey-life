
-- 1) Grant admin role to the creator
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'emb.creations.llc@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Helper: does a couple have any admin member?
CREATE OR REPLACE FUNCTION public.couple_has_admin(_couple_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.couple_members cm
    JOIN public.user_roles ur ON ur.user_id = cm.user_id
    WHERE cm.couple_id = _couple_id
      AND ur.role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.couple_has_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.couple_has_admin(uuid) TO authenticated, service_role;

-- 3) Patch couple_unlocked: admin couples bypass everything
CREATE OR REPLACE FUNCTION public.couple_unlocked(_couple_id uuid, _product text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req_level integer;
  req_days  integer;
  xp        bigint;
  shared    integer;
  lvl       integer;
BEGIN
  IF NOT public.is_couple_member(_couple_id) THEN
    RETURN FALSE;
  END IF;

  -- Admin bypass: any admin in the couple unlocks every product.
  IF public.couple_has_admin(_couple_id) THEN
    RETURN TRUE;
  END IF;

  -- Paid path wins next.
  IF _product IN ('time_capsule','the_atlas')
     AND public.couple_has_entitlement(_couple_id, _product) THEN
    RETURN TRUE;
  END IF;

  CASE _product
    WHEN 'quests_advanced' THEN req_level := 8;  req_days := 14;
    WHEN 'time_capsule'    THEN req_level := 11; req_days := 21;
    WHEN 'the_atlas'       THEN req_level := 15; req_days := 30;
    ELSE RETURN FALSE;
  END CASE;

  xp     := public.couple_total_xp(_couple_id);
  shared := public.couple_shared_days(_couple_id);
  lvl    := floor(sqrt(GREATEST(xp, 0) / 100.0))::int + 1;

  RETURN lvl >= req_level AND shared >= req_days;
END;
$$;

-- 4) Admin RLS on user_roles (existing self-read policy stays)
CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
