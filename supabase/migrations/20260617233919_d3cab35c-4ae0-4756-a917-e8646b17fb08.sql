
-- Replace partial unique index with a full unique index so ON CONFLICT (user_id, kind, dedupe_key) works.
DROP INDEX IF EXISTS public.xp_events_user_kind_dedupe_uidx;

CREATE UNIQUE INDEX xp_events_user_kind_dedupe_uidx
  ON public.xp_events (user_id, kind, dedupe_key);

-- Backfill XP rows that were silently dropped while the partial index was in place.
INSERT INTO public.xp_events (user_id, couple_id, kind, amount, ref_id, dedupe_key)
SELECT
  qsc.user_id,
  qsc.couple_id,
  'quest_step'::xp_kind,
  COALESCE(qs.xp_reward, CASE WHEN qs.kind = 'couple' THEN 120 ELSE 80 END),
  qsc.step_id,
  'quest_step:' || qsc.step_id::text
FROM public.quest_step_completions qsc
JOIN public.quest_steps qs ON qs.id = qsc.step_id
ON CONFLICT (user_id, kind, dedupe_key) DO NOTHING;

INSERT INTO public.xp_events (user_id, couple_id, kind, amount, ref_id, dedupe_key)
SELECT
  dr.user_id,
  dr.couple_id,
  'daily'::xp_kind,
  50,
  dr.prompt_id,
  'daily:' || to_char(dr.prompt_date, 'YYYY-MM-DD')
FROM public.daily_responses dr
ON CONFLICT (user_id, kind, dedupe_key) DO NOTHING;

INSERT INTO public.xp_events (user_id, couple_id, kind, amount, ref_id, dedupe_key)
SELECT
  sr.user_id,
  NULL,
  'solo_reflection'::xp_kind,
  30,
  sr.parent_prompt_id,
  'solo:' || to_char(sr.prompt_date, 'YYYY-MM-DD')
FROM public.solo_reflections sr
ON CONFLICT (user_id, kind, dedupe_key) DO NOTHING;
