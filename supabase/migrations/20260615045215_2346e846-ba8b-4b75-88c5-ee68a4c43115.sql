
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.couples TO authenticated;
GRANT ALL ON public.couples TO service_role;

GRANT SELECT, INSERT, DELETE ON public.couple_members TO authenticated;
GRANT ALL ON public.couple_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.couple_goals TO authenticated;
GRANT ALL ON public.couple_goals TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.letters TO authenticated;
GRANT ALL ON public.letters TO service_role;

GRANT SELECT ON public.daily_prompts TO authenticated;
GRANT ALL ON public.daily_prompts TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.daily_responses TO authenticated;
GRANT ALL ON public.daily_responses TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.solo_reflections TO authenticated;
GRANT ALL ON public.solo_reflections TO service_role;

GRANT SELECT ON public.quest_categories TO authenticated;
GRANT SELECT ON public.quest_chapters TO authenticated;
GRANT SELECT ON public.quest_steps TO authenticated;
GRANT ALL ON public.quest_categories TO service_role;
GRANT ALL ON public.quest_chapters TO service_role;
GRANT ALL ON public.quest_steps TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.quest_step_completions TO authenticated;
GRANT ALL ON public.quest_step_completions TO service_role;

GRANT SELECT ON public.insights TO authenticated;
GRANT ALL ON public.insights TO service_role;

GRANT SELECT ON public.xp_events TO authenticated;
GRANT ALL ON public.xp_events TO service_role;

GRANT SELECT ON public.user_streaks TO authenticated;
GRANT ALL ON public.user_streaks TO service_role;

GRANT SELECT ON public.couple_streaks TO authenticated;
GRANT ALL ON public.couple_streaks TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
