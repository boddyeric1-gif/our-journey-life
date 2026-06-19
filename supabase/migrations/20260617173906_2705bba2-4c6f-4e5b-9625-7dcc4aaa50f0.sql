
-- 1. Entitlements
CREATE TYPE public.subscription_tier AS ENUM ('free', 'premium');

ALTER TABLE public.profiles
  ADD COLUMN subscription_tier public.subscription_tier NOT NULL DEFAULT 'free';

ALTER TABLE public.couples
  ADD COLUMN subscription_tier public.subscription_tier NOT NULL DEFAULT 'free';

-- 2. Anniversary
ALTER TABLE public.couples
  ADD COLUMN anniversary_date date;

UPDATE public.couples
  SET anniversary_date = COALESCE(paired_at::date, created_at::date)
  WHERE anniversary_date IS NULL;

-- 3. Telemetry: app_events
CREATE TABLE public.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  couple_id uuid REFERENCES public.couples(id) ON DELETE SET NULL,
  event text NOT NULL,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.app_events TO authenticated;
GRANT ALL    ON public.app_events TO service_role;

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Signed-in users may only insert events attributed to themselves.
CREATE POLICY "users insert own events"
  ON public.app_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins may read all events for analytics dashboards.
CREATE POLICY "admins read all events"
  ON public.app_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No general SELECT to anon/authenticated; service role bypasses RLS.

CREATE INDEX app_events_event_time_idx  ON public.app_events (event, created_at DESC);
CREATE INDEX app_events_couple_time_idx ON public.app_events (couple_id, created_at DESC);
CREATE INDEX app_events_user_time_idx   ON public.app_events (user_id, created_at DESC);

-- Idempotency for reveal-style events keyed by (couple, event, props.date)
CREATE UNIQUE INDEX app_events_couple_event_date_uidx
  ON public.app_events (couple_id, event, ((props->>'date')))
  WHERE event IN ('daily_reveal_completed', 'chapter_completed');

-- 4. Weekly Connected Couples view (service-role / admin only)
CREATE OR REPLACE VIEW public.weekly_connected_couples AS
SELECT
  date_trunc('week', created_at)::date AS week_start,
  count(DISTINCT couple_id) FILTER (WHERE event = 'daily_reveal_completed') AS connected_couples
FROM public.app_events
WHERE couple_id IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC;

REVOKE ALL ON public.weekly_connected_couples FROM anon, authenticated;
GRANT SELECT ON public.weekly_connected_couples TO service_role;

-- 5. Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.letters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quest_step_completions;
