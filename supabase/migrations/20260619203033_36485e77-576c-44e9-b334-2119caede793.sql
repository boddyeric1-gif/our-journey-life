
-- 1. Protect subscription_tier on profiles & couples from user UPDATEs via trigger
CREATE OR REPLACE FUNCTION public.prevent_subscription_tier_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role to change tier; block everyone else
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     AND current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'subscription_tier can only be changed by the server';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_subscription_tier ON public.profiles;
CREATE TRIGGER profiles_protect_subscription_tier
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_subscription_tier_change();

DROP TRIGGER IF EXISTS couples_protect_subscription_tier ON public.couples;
CREATE TRIGGER couples_protect_subscription_tier
  BEFORE UPDATE ON public.couples
  FOR EACH ROW EXECUTE FUNCTION public.prevent_subscription_tier_change();

-- 2. Letters: split update policy so only the author can edit body,
--    while partner may mark seen_at via a dedicated policy.
DROP POLICY IF EXISTS "letters member update" ON public.letters;

CREATE POLICY "letters author update"
  ON public.letters
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid() AND is_couple_member(couple_id))
  WITH CHECK (author_id = auth.uid() AND is_couple_member(couple_id));

-- Allow partner to mark seen_at only (enforced via trigger below)
CREATE POLICY "letters partner mark seen"
  ON public.letters
  FOR UPDATE
  TO authenticated
  USING (is_couple_member(couple_id) AND author_id <> auth.uid())
  WITH CHECK (is_couple_member(couple_id) AND author_id <> auth.uid());

CREATE OR REPLACE FUNCTION public.letters_partner_only_seen_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.author_id <> auth.uid() THEN
    -- Partner update: only seen_at may change
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.couple_id IS DISTINCT FROM OLD.couple_id
       OR NEW.author_id IS DISTINCT FROM OLD.author_id
       OR NEW.body IS DISTINCT FROM OLD.body
       OR NEW.is_first_letter IS DISTINCT FROM OLD.is_first_letter
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Partners may only update seen_at on letters they did not author';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS letters_partner_only_seen_at ON public.letters;
CREATE TRIGGER letters_partner_only_seen_at
  BEFORE UPDATE ON public.letters
  FOR EACH ROW EXECUTE FUNCTION public.letters_partner_only_seen_at();

-- 3. app_events: constrain insertable event names (analytics whitelist)
ALTER TABLE public.app_events
  DROP CONSTRAINT IF EXISTS app_events_event_whitelist;

ALTER TABLE public.app_events
  ADD CONSTRAINT app_events_event_whitelist
  CHECK (event ~ '^[a-z][a-z0-9_.]{1,63}$'
         AND event NOT LIKE 'payment%'
         AND event NOT LIKE 'subscription%'
         AND event NOT LIKE 'xp.%'
         AND event NOT LIKE 'admin.%'
         AND event NOT LIKE 'server.%');

-- 4. invites: remove user-driven UPDATE; lifecycle handled server-side only
DROP POLICY IF EXISTS "invites update by creator" ON public.invites;
