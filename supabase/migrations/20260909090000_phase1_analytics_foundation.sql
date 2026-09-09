-- ============================================================================
-- Our Journey — Phase 1 Analytics Foundation
--
-- Goals:
--   * durable first/last-touch attribution
--   * reliable event taxonomy and funnel instrumentation at the DB boundary
--   * once-per-couple activation
--   * queryable DAU/WAU/MAU, retention cohorts, funnel and revenue metrics
--
-- IMPORTANT: profiles.subscription_tier and couples.subscription_tier are
-- legacy/vestigial fields. They are intentionally untouched here.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Marketing attribution
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_attributions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_touch_at timestamptz NOT NULL DEFAULT now(),
  first_touch_source text NOT NULL DEFAULT 'direct',
  first_touch_medium text,
  first_touch_campaign text,
  first_touch_content text,
  first_touch_term text,
  last_touch_at timestamptz NOT NULL DEFAULT now(),
  last_touch_source text NOT NULL DEFAULT 'direct',
  last_touch_medium text,
  last_touch_campaign text,
  last_touch_content text,
  last_touch_term text
);

CREATE INDEX IF NOT EXISTS marketing_attributions_first_source_idx
  ON public.marketing_attributions(first_touch_source, first_touch_at DESC);
CREATE INDEX IF NOT EXISTS marketing_attributions_last_source_idx
  ON public.marketing_attributions(last_touch_source, last_touch_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.marketing_attributions TO authenticated;
GRANT ALL ON public.marketing_attributions TO service_role;
ALTER TABLE public.marketing_attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing attribution self select" ON public.marketing_attributions;
CREATE POLICY "marketing attribution self select"
  ON public.marketing_attributions FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "marketing attribution self insert" ON public.marketing_attributions;
CREATE POLICY "marketing attribution self insert"
  ON public.marketing_attributions FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "marketing attribution self update" ON public.marketing_attributions;
CREATE POLICY "marketing attribution self update"
  ON public.marketing_attributions FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Atomic first-touch/last-touch capture. The client can call this safely with
-- its own auth token; the function refuses to write for another user.
CREATE OR REPLACE FUNCTION public.capture_marketing_attribution(
  _source text DEFAULT 'direct',
  _medium text DEFAULT NULL,
  _campaign text DEFAULT NULL,
  _content text DEFAULT NULL,
  _term text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (select auth.uid());
  v_source text := COALESCE(NULLIF(trim(_source), ''), 'direct');
  v_now timestamptz := now();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.marketing_attributions (
    user_id,
    first_touch_at,
    first_touch_source,
    first_touch_medium,
    first_touch_campaign,
    first_touch_content,
    first_touch_term,
    last_touch_at,
    last_touch_source,
    last_touch_medium,
    last_touch_campaign,
    last_touch_content,
    last_touch_term
  ) VALUES (
    v_user_id,
    v_now,
    v_source,
    _medium,
    _campaign,
    _content,
    _term,
    v_now,
    v_source,
    _medium,
    _campaign,
    _content,
    _term
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_touch_at = EXCLUDED.last_touch_at,
    last_touch_source = EXCLUDED.last_touch_source,
    last_touch_medium = EXCLUDED.last_touch_medium,
    last_touch_campaign = EXCLUDED.last_touch_campaign,
    last_touch_content = EXCLUDED.last_touch_content,
    last_touch_term = EXCLUDED.last_touch_term;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.capture_marketing_attribution(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.capture_marketing_attribution(text, text, text, text, text) TO authenticated;

-- --------------------------------------------------------------------------
-- Event reliability / activation guardrails
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS app_events_created_at_idx
  ON public.app_events(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS app_events_couple_activated_uidx
  ON public.app_events(couple_id)
  WHERE event = 'couple_activated' AND couple_id IS NOT NULL;

-- Trigger-only writer. Analytics must never break the product if telemetry
-- itself encounters a transient/schema issue.
CREATE OR REPLACE FUNCTION public.analytics_record_event(
  _event text,
  _user_id uuid DEFAULT NULL,
  _couple_id uuid DEFAULT NULL,
  _props jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.app_events (user_id, couple_id, event, props)
  VALUES (_user_id, _couple_id, _event, COALESCE(_props, '{}'::jsonb));
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'analytics event % failed: %', _event, SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_record_event(text, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_record_event(text, uuid, uuid, jsonb) TO service_role;

-- --------------------------------------------------------------------------
-- Signup + profile completion
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.analytics_after_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.analytics_record_event(
    'user_signed_up', NEW.id, NULL,
    jsonb_build_object('provider', COALESCE(NEW.raw_app_meta_data->>'provider', 'unknown'))
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'signup analytics failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_after_user_signup ON auth.users;
CREATE TRIGGER analytics_after_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.analytics_after_user_signup();

CREATE OR REPLACE FUNCTION public.analytics_profile_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.onboarded_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.onboarded_at IS NULL) THEN
    PERFORM public.analytics_record_event(
      'profile_completed', NEW.id, NEW.current_couple_id,
      jsonb_build_object('onboarded_at', NEW.onboarded_at)
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'profile analytics failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_profile_completed ON public.profiles;
CREATE TRIGGER analytics_profile_completed
  AFTER INSERT OR UPDATE OF onboarded_at ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.analytics_profile_completed();

-- --------------------------------------------------------------------------
-- Couple creation / joining / invitations
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.analytics_couple_member_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  member_count integer;
BEGIN
  SELECT count(*) INTO member_count
  FROM public.couple_members
  WHERE couple_id = NEW.couple_id;

  IF member_count = 1 THEN
    PERFORM public.analytics_record_event(
      'couple_created', NEW.user_id, NEW.couple_id,
      jsonb_build_object('member_role', 'first_member')
    );
  END IF;

  PERFORM public.analytics_record_event(
    'couple_joined', NEW.user_id, NEW.couple_id,
    jsonb_build_object('member_role', CASE WHEN member_count = 1 THEN 'first_member' ELSE 'partner' END)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'couple member analytics failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_couple_member_events ON public.couple_members;
CREATE TRIGGER analytics_couple_member_events
  AFTER INSERT ON public.couple_members
  FOR EACH ROW EXECUTE FUNCTION public.analytics_couple_member_events();

CREATE OR REPLACE FUNCTION public.analytics_invite_sent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.analytics_record_event(
    'couple_invite_sent', NEW.created_by, NEW.couple_id,
    jsonb_build_object('invite_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invite sent analytics failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_invite_sent ON public.invites;
CREATE TRIGGER analytics_invite_sent
  AFTER INSERT ON public.invites
  FOR EACH ROW EXECUTE FUNCTION public.analytics_invite_sent();

CREATE OR REPLACE FUNCTION public.analytics_invite_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.used_by IS NULL AND NEW.used_by IS NOT NULL THEN
    PERFORM public.analytics_record_event(
      'couple_invite_accepted', NEW.used_by, NEW.couple_id,
      jsonb_build_object('invite_id', NEW.id)
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invite accepted analytics failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_invite_accepted ON public.invites;
CREATE TRIGGER analytics_invite_accepted
  AFTER UPDATE OF used_by ON public.invites
  FOR EACH ROW EXECUTE FUNCTION public.analytics_invite_accepted();

-- --------------------------------------------------------------------------
-- Activity completion + once-per-couple activation
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.analytics_maybe_activate_couple(
  _user_id uuid,
  _couple_id uuid,
  _activity_event text,
  _activity_props jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  member_count integer;
  activated_exists boolean;
BEGIN
  IF _couple_id IS NULL THEN RETURN; END IF;

  SELECT count(*) INTO member_count
  FROM public.couple_members
  WHERE couple_id = _couple_id;

  IF member_count < 2 THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.app_events
    WHERE couple_id = _couple_id AND event = 'couple_activated'
  ) INTO activated_exists;

  IF activated_exists THEN RETURN; END IF;

  PERFORM public.analytics_record_event(
    'first_activity_completed', _user_id, _couple_id,
    jsonb_build_object('activity_event', _activity_event) || COALESCE(_activity_props, '{}'::jsonb)
  );

  PERFORM public.analytics_record_event(
    'couple_activated', _user_id, _couple_id,
    jsonb_build_object('activation_definition', 'both_partners_joined_and_first_meaningful_activity_completed', 'activity_event', _activity_event)
      || COALESCE(_activity_props, '{}'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_maybe_activate_couple(uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_maybe_activate_couple(uuid, uuid, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.analytics_daily_response_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.analytics_record_event(
    'prompt_completed', NEW.user_id, NEW.couple_id,
    jsonb_build_object('prompt_id', NEW.prompt_id, 'date', NEW.prompt_date)
  );
  PERFORM public.analytics_record_event(
    'activity_completed', NEW.user_id, NEW.couple_id,
    jsonb_build_object('activity_type', 'daily_prompt', 'prompt_id', NEW.prompt_id, 'date', NEW.prompt_date)
  );
  PERFORM public.analytics_maybe_activate_couple(
    NEW.user_id, NEW.couple_id, 'daily_prompt',
    jsonb_build_object('prompt_id', NEW.prompt_id, 'date', NEW.prompt_date)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'daily analytics failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_daily_response_completed ON public.daily_responses;
CREATE TRIGGER analytics_daily_response_completed
  AFTER INSERT ON public.daily_responses
  FOR EACH ROW EXECUTE FUNCTION public.analytics_daily_response_completed();

CREATE OR REPLACE FUNCTION public.analytics_solo_reflection_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_couple_id uuid;
BEGIN
  SELECT current_couple_id INTO v_couple_id FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.analytics_record_event(
    'activity_completed', NEW.user_id, v_couple_id,
    jsonb_build_object('activity_type', 'solo_reflection', 'prompt_id', NEW.parent_prompt_id, 'date', NEW.prompt_date)
  );
  PERFORM public.analytics_maybe_activate_couple(
    NEW.user_id, v_couple_id, 'solo_reflection',
    jsonb_build_object('prompt_id', NEW.parent_prompt_id, 'date', NEW.prompt_date)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'solo reflection analytics failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_solo_reflection_completed ON public.solo_reflections;
CREATE TRIGGER analytics_solo_reflection_completed
  AFTER INSERT ON public.solo_reflections
  FOR EACH ROW EXECUTE FUNCTION public.analytics_solo_reflection_completed();

CREATE OR REPLACE FUNCTION public.analytics_quest_step_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_chapter_id uuid;
  v_couple_id uuid;
  v_chapter_complete boolean := false;
  v_chapter_title text;
BEGIN
  SELECT chapter_id INTO v_chapter_id FROM public.quest_steps WHERE id = NEW.step_id;
  v_couple_id := NEW.couple_id;

  PERFORM public.analytics_record_event(
    'activity_completed', NEW.user_id, v_couple_id,
    jsonb_build_object('activity_type', 'quest_step', 'step_id', NEW.step_id)
  );

  IF v_chapter_id IS NOT NULL THEN
    SELECT title INTO v_chapter_title FROM public.quest_chapters WHERE id = v_chapter_id;
    SELECT NOT EXISTS (
      SELECT 1
      FROM public.quest_steps qs
      WHERE qs.chapter_id = v_chapter_id
        AND NOT EXISTS (
          SELECT 1 FROM public.quest_step_completions qsc
          WHERE qsc.step_id = qs.id AND qsc.user_id = NEW.user_id
        )
    ) INTO v_chapter_complete;

    IF v_chapter_complete THEN
      PERFORM public.analytics_record_event(
        'quest_completed', NEW.user_id, v_couple_id,
        jsonb_build_object('chapter_id', v_chapter_id, 'chapter_title', v_chapter_title)
      );
    END IF;
  END IF;

  PERFORM public.analytics_maybe_activate_couple(
    NEW.user_id, v_couple_id, 'quest_step',
    jsonb_build_object('step_id', NEW.step_id, 'chapter_id', v_chapter_id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'quest analytics failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_quest_step_completed ON public.quest_step_completions;
CREATE TRIGGER analytics_quest_step_completed
  AFTER INSERT ON public.quest_step_completions
  FOR EACH ROW EXECUTE FUNCTION public.analytics_quest_step_completed();

CREATE OR REPLACE FUNCTION public.analytics_letter_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.analytics_record_event(
    'activity_completed', NEW.author_id, NEW.couple_id,
    jsonb_build_object('activity_type', 'letter', 'letter_id', NEW.id)
  );
  PERFORM public.analytics_maybe_activate_couple(
    NEW.author_id, NEW.couple_id, 'letter',
    jsonb_build_object('letter_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'letter analytics failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_letter_completed ON public.letters;
CREATE TRIGGER analytics_letter_completed
  AFTER INSERT ON public.letters
  FOR EACH ROW EXECUTE FUNCTION public.analytics_letter_completed();

-- --------------------------------------------------------------------------
-- Monetization: successful one-time entitlement grants are the source of
-- truth for purchase_completed. Never infer payment from client claims.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.analytics_purchase_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    PERFORM public.analytics_record_event(
      'purchase_completed', NEW.purchased_by, NEW.couple_id,
      jsonb_build_object(
        'product', NEW.product,
        'amount_cents', NEW.amount_cents,
        'currency', NEW.currency,
        'stripe_session_id', NEW.stripe_session_id,
        'stripe_payment_intent_id', NEW.stripe_payment_intent_id
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'purchase analytics failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_purchase_completed ON public.couple_entitlements;
CREATE TRIGGER analytics_purchase_completed
  AFTER INSERT OR UPDATE OF status ON public.couple_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.analytics_purchase_completed();

-- --------------------------------------------------------------------------
-- Buyer-facing metric layer
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.analytics_daily_activity
WITH (security_invoker = true)
AS
SELECT
  date_trunc('day', created_at)::date AS activity_date,
  count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS dau,
  count(DISTINCT couple_id) FILTER (WHERE couple_id IS NOT NULL) AS active_couples,
  count(DISTINCT (props->>'session_id')) FILTER (WHERE event = 'session_started' AND props->>'session_id' IS NOT NULL) AS sessions,
  count(*) FILTER (WHERE event = 'activity_completed') AS activities_completed,
  count(*) FILTER (WHERE event = 'purchase_completed') AS purchases_completed,
  COALESCE(sum((props->>'amount_cents')::numeric) FILTER (WHERE event = 'purchase_completed'), 0) AS gross_revenue_cents
FROM public.app_events
GROUP BY 1;

CREATE OR REPLACE VIEW public.analytics_user_cohorts
WITH (security_invoker = true)
AS
WITH signups AS (
  SELECT user_id, min(created_at) AS signup_at
  FROM public.app_events
  WHERE event = 'user_signed_up' AND user_id IS NOT NULL
  GROUP BY user_id
)
SELECT
  s.user_id,
  s.signup_at,
  s.signup_at::date AS cohort_date,
  EXISTS (
    SELECT 1 FROM public.app_events e
    WHERE e.user_id = s.user_id AND e.created_at >= s.signup_at + interval '1 day'
      AND e.created_at < s.signup_at + interval '2 days'
  ) AS retained_d1,
  EXISTS (
    SELECT 1 FROM public.app_events e
    WHERE e.user_id = s.user_id AND e.created_at >= s.signup_at + interval '7 days'
      AND e.created_at < s.signup_at + interval '8 days'
  ) AS retained_d7,
  EXISTS (
    SELECT 1 FROM public.app_events e
    WHERE e.user_id = s.user_id AND e.created_at >= s.signup_at + interval '30 days'
      AND e.created_at < s.signup_at + interval '31 days'
  ) AS retained_d30
FROM signups s;

CREATE OR REPLACE VIEW public.analytics_couple_funnel
WITH (security_invoker = true)
AS
SELECT
  c.id AS couple_id,
  c.created_at,
  min(e1.created_at) FILTER (WHERE e1.event = 'couple_created') AS couple_created_at,
  min(e2.created_at) FILTER (WHERE e2.event = 'couple_invite_sent') AS invite_sent_at,
  min(e3.created_at) FILTER (WHERE e3.event = 'couple_invite_accepted') AS invite_accepted_at,
  min(e4.created_at) FILTER (WHERE e4.event = 'couple_joined') AS second_partner_joined_at,
  min(e5.created_at) FILTER (WHERE e5.event = 'couple_activated') AS activated_at,
  EXTRACT(EPOCH FROM (
    min(e5.created_at) FILTER (WHERE e5.event = 'couple_activated')
    - min(e4.created_at) FILTER (WHERE e4.event = 'couple_joined')
  )) / 3600.0 AS hours_partner_join_to_activation
FROM public.couples c
LEFT JOIN public.app_events e1 ON e1.couple_id = c.id
LEFT JOIN public.app_events e2 ON e2.couple_id = c.id
LEFT JOIN public.app_events e3 ON e3.couple_id = c.id
LEFT JOIN public.app_events e4 ON e4.couple_id = c.id
LEFT JOIN public.app_events e5 ON e5.couple_id = c.id
GROUP BY c.id, c.created_at;

-- Views contain buyer-sensitive data. Keep them server/admin-only.
REVOKE ALL ON public.analytics_daily_activity FROM anon, authenticated;
REVOKE ALL ON public.analytics_user_cohorts FROM anon, authenticated;
REVOKE ALL ON public.analytics_couple_funnel FROM anon, authenticated;
GRANT SELECT ON public.analytics_daily_activity TO service_role;
GRANT SELECT ON public.analytics_user_cohorts TO service_role;
GRANT SELECT ON public.analytics_couple_funnel TO service_role;

-- --------------------------------------------------------------------------
-- Historical metric definitions (kept in SQL as comments so they travel with
-- the migration and can be copied into a future dashboard query layer).
-- --------------------------------------------------------------------------
-- DAU = distinct user_id with app_opened/session_started/activity events in a day.
-- WAU = distinct user_id with those events in a rolling 7-day window.
-- MAU = distinct user_id with those events in a rolling 30-day window.
-- Activated couple = two couple_members + first meaningful activity completion.
-- D1/D7/D30 = any qualifying event in the [N, N+1 day) window after signup.
-- CAC/LTV require campaign spend and enough paid history; do not infer them here.
