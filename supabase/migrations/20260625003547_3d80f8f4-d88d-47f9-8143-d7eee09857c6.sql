-- Hide raw Stripe identifiers from client reads on couple_entitlements.
-- Authenticated users (including the purchaser) only need product/status/timing
-- on the client. Stripe IDs, price IDs, and amount stay readable to service_role
-- only (webhook + admin server functions).

REVOKE SELECT ON public.couple_entitlements FROM authenticated;

GRANT SELECT (
  id,
  couple_id,
  product,
  status,
  purchased_by,
  granted_at,
  revoked_at,
  revoke_reason,
  created_at,
  updated_at
) ON public.couple_entitlements TO authenticated;

-- service_role keeps full access for webhook upserts and admin reads.
GRANT ALL ON public.couple_entitlements TO service_role;