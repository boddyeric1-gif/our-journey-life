
-- Couple entitlements: durable record of premium unlocks
CREATE TABLE public.couple_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  product text NOT NULL CHECK (product IN ('time_capsule','the_atlas')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  purchased_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  price_id text,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  amount_cents integer,
  currency text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (couple_id, product)
);

CREATE INDEX idx_couple_entitlements_couple ON public.couple_entitlements(couple_id);
CREATE INDEX idx_couple_entitlements_status ON public.couple_entitlements(status);

GRANT SELECT ON public.couple_entitlements TO authenticated;
GRANT ALL ON public.couple_entitlements TO service_role;

ALTER TABLE public.couple_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can view their entitlements"
  ON public.couple_entitlements FOR SELECT
  TO authenticated
  USING (public.is_couple_member(couple_id));

CREATE TRIGGER couple_entitlements_touch_updated_at
  BEFORE UPDATE ON public.couple_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Helper for app code
CREATE OR REPLACE FUNCTION public.couple_has_entitlement(_couple_id uuid, _product text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couple_entitlements
    WHERE couple_id = _couple_id
      AND product = _product
      AND status = 'active'
  );
$$;
