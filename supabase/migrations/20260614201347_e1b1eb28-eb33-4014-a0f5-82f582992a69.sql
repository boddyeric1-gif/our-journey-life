
-- =========================================================================
-- ENUMS
-- =========================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.relationship_stage AS ENUM ('dating', 'engaged', 'married', 'long_term');
CREATE TYPE public.love_language AS ENUM ('words', 'acts', 'gifts', 'time', 'touch');
CREATE TYPE public.couple_status AS ENUM ('pending', 'active', 'archived');
CREATE TYPE public.quest_step_kind AS ENUM ('solo', 'couple');
CREATE TYPE public.xp_kind AS ENUM ('daily', 'solo_reflection', 'quest_step', 'first_pair', 'letter', 'insight');

-- =========================================================================
-- PROFILES
-- =========================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  relationship_stage public.relationship_stage,
  anniversary DATE,
  love_language public.love_language,
  onboarded_at TIMESTAMPTZ,
  current_couple_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- =========================================================================
-- COUPLES + MEMBERS
-- =========================================================================
CREATE TABLE public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bond_name TEXT,
  status public.couple_status NOT NULL DEFAULT 'pending',
  paired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couples TO authenticated;
GRANT ALL ON public.couples TO service_role;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.couple_members (
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (couple_id, user_id)
);
CREATE INDEX couple_members_user_idx ON public.couple_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couple_members TO authenticated;
GRANT ALL ON public.couple_members TO service_role;
ALTER TABLE public.couple_members ENABLE ROW LEVEL SECURITY;

-- Helper function: am I a member of this couple?
CREATE OR REPLACE FUNCTION public.is_couple_member(_couple_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.couple_members WHERE couple_id = _couple_id AND user_id = auth.uid());
$$;

CREATE POLICY "couples member select" ON public.couples FOR SELECT TO authenticated
  USING (public.is_couple_member(id));
CREATE POLICY "couples self insert" ON public.couples FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "couples member update" ON public.couples FOR UPDATE TO authenticated
  USING (public.is_couple_member(id)) WITH CHECK (public.is_couple_member(id));

CREATE POLICY "couple_members member select" ON public.couple_members FOR SELECT TO authenticated
  USING (public.is_couple_member(couple_id));
CREATE POLICY "couple_members self insert" ON public.couple_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "couple_members self delete" ON public.couple_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Profile FK to current_couple_id (added after couples exists)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_current_couple_fk
  FOREIGN KEY (current_couple_id) REFERENCES public.couples(id) ON DELETE SET NULL;

-- =========================================================================
-- INVITES
-- =========================================================================
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
-- Anyone signed-in can look up by code to accept; creator can also read
CREATE POLICY "invites select all auth" ON public.invites FOR SELECT TO authenticated USING (true);
CREATE POLICY "invites self insert" ON public.invites FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "invites update auth" ON public.invites FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- COUPLE GOALS
-- =========================================================================
CREATE TABLE public.couple_goals (
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  PRIMARY KEY (couple_id, goal)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couple_goals TO authenticated;
GRANT ALL ON public.couple_goals TO service_role;
ALTER TABLE public.couple_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals member all" ON public.couple_goals FOR ALL TO authenticated
  USING (public.is_couple_member(couple_id)) WITH CHECK (public.is_couple_member(couple_id));

-- =========================================================================
-- LETTERS (first letter + async drafts)
-- =========================================================================
CREATE TABLE public.letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_first_letter BOOLEAN NOT NULL DEFAULT false,
  seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX letters_couple_idx ON public.letters(couple_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.letters TO authenticated;
GRANT ALL ON public.letters TO service_role;
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "letters member select" ON public.letters FOR SELECT TO authenticated
  USING (public.is_couple_member(couple_id));
CREATE POLICY "letters author insert" ON public.letters FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_couple_member(couple_id));
CREATE POLICY "letters member update" ON public.letters FOR UPDATE TO authenticated
  USING (public.is_couple_member(couple_id)) WITH CHECK (public.is_couple_member(couple_id));

-- =========================================================================
-- DAILY PROMPTS + RESPONSES
-- =========================================================================
CREATE TABLE public.daily_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body TEXT NOT NULL,
  theme TEXT,
  position INT NOT NULL UNIQUE
);
GRANT SELECT ON public.daily_prompts TO authenticated;
GRANT ALL ON public.daily_prompts TO service_role;
ALTER TABLE public.daily_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prompts read all auth" ON public.daily_prompts FOR SELECT TO authenticated USING (true);

CREATE TABLE public.daily_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.daily_prompts(id),
  prompt_date DATE NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (couple_id, user_id, prompt_date)
);
CREATE INDEX daily_responses_couple_date_idx ON public.daily_responses(couple_id, prompt_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_responses TO authenticated;
GRANT ALL ON public.daily_responses TO service_role;
ALTER TABLE public.daily_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "responses member select" ON public.daily_responses FOR SELECT TO authenticated
  USING (public.is_couple_member(couple_id));
CREATE POLICY "responses self insert" ON public.daily_responses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_couple_member(couple_id));

-- =========================================================================
-- SOLO REFLECTIONS
-- =========================================================================
CREATE TABLE public.solo_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_date DATE NOT NULL,
  parent_prompt_id UUID REFERENCES public.daily_prompts(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX solo_reflections_user_idx ON public.solo_reflections(user_id, prompt_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solo_reflections TO authenticated;
GRANT ALL ON public.solo_reflections TO service_role;
ALTER TABLE public.solo_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reflections self all" ON public.solo_reflections FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =========================================================================
-- QUEST CATEGORIES / CHAPTERS / STEPS / COMPLETIONS
-- =========================================================================
CREATE TABLE public.quest_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  accent TEXT,
  position INT NOT NULL
);
GRANT SELECT ON public.quest_categories TO authenticated;
GRANT ALL ON public.quest_categories TO service_role;
ALTER TABLE public.quest_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories read auth" ON public.quest_categories FOR SELECT TO authenticated USING (true);

CREATE TABLE public.quest_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.quest_categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  position INT NOT NULL
);
GRANT SELECT ON public.quest_chapters TO authenticated;
GRANT ALL ON public.quest_chapters TO service_role;
ALTER TABLE public.quest_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chapters read auth" ON public.quest_chapters FOR SELECT TO authenticated USING (true);

CREATE TABLE public.quest_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.quest_chapters(id) ON DELETE CASCADE,
  position INT NOT NULL,
  kind public.quest_step_kind NOT NULL,
  teaching TEXT NOT NULL,
  prompt TEXT NOT NULL,
  ritual TEXT,
  xp_reward INT NOT NULL DEFAULT 100,
  UNIQUE (chapter_id, position)
);
GRANT SELECT ON public.quest_steps TO authenticated;
GRANT ALL ON public.quest_steps TO service_role;
ALTER TABLE public.quest_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "steps read auth" ON public.quest_steps FOR SELECT TO authenticated USING (true);

CREATE TABLE public.quest_step_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
  step_id UUID NOT NULL REFERENCES public.quest_steps(id) ON DELETE CASCADE,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, step_id)
);
CREATE INDEX completions_user_idx ON public.quest_step_completions(user_id);
CREATE INDEX completions_couple_idx ON public.quest_step_completions(couple_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quest_step_completions TO authenticated;
GRANT ALL ON public.quest_step_completions TO service_role;
ALTER TABLE public.quest_step_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completions self select" ON public.quest_step_completions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (couple_id IS NOT NULL AND public.is_couple_member(couple_id)));
CREATE POLICY "completions self insert" ON public.quest_step_completions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =========================================================================
-- INSIGHTS
-- =========================================================================
CREATE TABLE public.insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  body TEXT NOT NULL,
  read_minutes INT NOT NULL DEFAULT 2,
  tags TEXT[] NOT NULL DEFAULT '{}',
  position INT NOT NULL
);
GRANT SELECT ON public.insights TO authenticated;
GRANT ALL ON public.insights TO service_role;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insights read auth" ON public.insights FOR SELECT TO authenticated USING (true);

-- =========================================================================
-- XP + STREAKS
-- =========================================================================
CREATE TABLE public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
  kind public.xp_kind NOT NULL,
  amount INT NOT NULL,
  ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX xp_user_idx ON public.xp_events(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.xp_events TO authenticated;
GRANT ALL ON public.xp_events TO service_role;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp self select" ON public.xp_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (couple_id IS NOT NULL AND public.is_couple_member(couple_id)));
CREATE POLICY "xp self insert" ON public.xp_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.user_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  freezes_available INT NOT NULL DEFAULT 2,
  last_active_date DATE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_streaks TO authenticated;
GRANT ALL ON public.user_streaks TO service_role;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaks self all" ON public.user_streaks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.couple_streaks (
  couple_id UUID PRIMARY KEY REFERENCES public.couples(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_both_active_date DATE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couple_streaks TO authenticated;
GRANT ALL ON public.couple_streaks TO service_role;
ALTER TABLE public.couple_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "couple streaks member all" ON public.couple_streaks FOR ALL TO authenticated
  USING (public.is_couple_member(couple_id)) WITH CHECK (public.is_couple_member(couple_id));

-- =========================================================================
-- USER ROLES
-- =========================================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles self select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- =========================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_streaks (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================================
-- SEED: DAILY PROMPTS (60 prompts)
-- =========================================================================
INSERT INTO public.daily_prompts (position, theme, body) VALUES
(1,'gratitude','One small thing my partner did this week that I haven''t thanked them for.'),
(2,'memory','A memory of us I want to hold onto forever.'),
(3,'gratitude','Something about my partner I''m quietly proud of.'),
(4,'curiosity','A question I''ve never asked you but always wanted to.'),
(5,'tenderness','The exact moment today I felt closest to you.'),
(6,'curiosity','If we had a free Saturday, what would my dream day with you look like?'),
(7,'memory','The first time I knew this was real.'),
(8,'gratitude','One way you make ordinary days feel less ordinary.'),
(9,'tenderness','Something I love about your face I''ve never told you.'),
(10,'growth','One way I''ve grown because of you.'),
(11,'curiosity','What part of your week am I missing? Tell me about it.'),
(12,'memory','A small ritual of ours I never want to lose.'),
(13,'tenderness','Something I notice about you that other people miss.'),
(14,'gratitude','A way you took care of me recently I want to acknowledge.'),
(15,'curiosity','What''s one thing you''re thinking about lately that you haven''t shared?'),
(16,'growth','A part of me you''ve helped me make peace with.'),
(17,'memory','A song or smell that always brings me back to us.'),
(18,'tenderness','A look you give me that I always feel even when I don''t say so.'),
(19,'gratitude','One small kindness I want to repay.'),
(20,'curiosity','If we were strangers meeting today, what would I notice about you first?'),
(21,'growth','Something I''m working on that I want you to know about.'),
(22,'memory','A trip or night I''d relive exactly as it was.'),
(23,'tenderness','One way your body language tells me you love me.'),
(24,'gratitude','The most thoughtful thing you did this month.'),
(25,'curiosity','What''s something you secretly want us to try?'),
(26,'growth','A way I want to show up better for you.'),
(27,'memory','The funniest thing we''ve laughed about together.'),
(28,'tenderness','A part of our home that feels like us.'),
(29,'gratitude','A way you''ve made me feel safe.'),
(30,'curiosity','What would surprise me about your inner monologue today?'),
(31,'growth','A fear about us I''m ready to name softly.'),
(32,'memory','A version of you from years ago I still love.'),
(33,'tenderness','The smallest thing you do that always lands.'),
(34,'gratitude','A way you''ve been patient with me lately.'),
(35,'curiosity','If we had one extra hour together today, how would we spend it?'),
(36,'growth','One thing I want to be braver about with you.'),
(37,'memory','A photo of us I think about often and why.'),
(38,'tenderness','A way I felt seen by you this week.'),
(39,'gratitude','Something about our life I don''t want to take for granted.'),
(40,'curiosity','What''s something you''ve been craving lately — literally or otherwise?'),
(41,'growth','One way our relationship has changed me for the better.'),
(42,'memory','A morning I want us to have again.'),
(43,'tenderness','A way I want to touch base with you more.'),
(44,'gratitude','One person, place, or thing I''m glad we share.'),
(45,'curiosity','What''s a small dream you''ve been quiet about?'),
(46,'growth','Something I''ve been avoiding that I''d like to talk about gently.'),
(47,'memory','A holiday or season that always feels like us.'),
(48,'tenderness','A compliment I''ve been saving up.'),
(49,'gratitude','A way you make me feel chosen.'),
(50,'curiosity','What would your favorite version of next year look like, with me in it?'),
(51,'growth','One way I want to celebrate you more often.'),
(52,'memory','A meal we''ve had that felt like a love letter.'),
(53,'tenderness','A texture of our love I want more of.'),
(54,'gratitude','Something you do that I''d miss instantly if it stopped.'),
(55,'curiosity','What''s a piece of yourself you''ve been protecting?'),
(56,'growth','A boundary I want us to honor together.'),
(57,'memory','A first I want to have with you.'),
(58,'tenderness','A way silence feels different when it''s with you.'),
(59,'gratitude','A reason today felt easier because of you.'),
(60,'curiosity','One question I want you to ask me back, in your own words.');

-- =========================================================================
-- SEED: QUEST CATEGORIES + CHAPTERS + STEPS
-- =========================================================================
INSERT INTO public.quest_categories (slug, title, subtitle, accent, position) VALUES
('communication','Communication','The grammar of being known','rust',1),
('trust','Trust','The architecture of safety','clay',2);

-- Communication chapters
WITH cat AS (SELECT id FROM public.quest_categories WHERE slug='communication')
INSERT INTO public.quest_chapters (category_id, slug, title, summary, position)
SELECT cat.id, c.slug, c.title, c.summary, c.position FROM cat, (VALUES
  ('comm-1','The Listening Reps','Three days of listening without fixing.', 1),
  ('comm-2','Soft Starts','Begin hard conversations the way you''d want them begun.', 2),
  ('comm-3','Naming It','Find the precise word for what you''re feeling.', 3),
  ('comm-4','Repair Kits','Small returns after small ruptures.', 4),
  ('comm-5','The Weekly Walk','Make space for the harder questions on purpose.', 5),
  ('comm-6','Saying The Quiet Thing','Practice saying the thing you usually swallow.', 6)
) AS c(slug,title,summary,position);

-- Trust chapters
WITH cat AS (SELECT id FROM public.quest_categories WHERE slug='trust')
INSERT INTO public.quest_chapters (category_id, slug, title, summary, position)
SELECT cat.id, c.slug, c.title, c.summary, c.position FROM cat, (VALUES
  ('trust-1','Safety Inventory','Map the moments you feel most held.', 1),
  ('trust-2','The Small Promises','Build trust with the tiniest reliable acts.', 2),
  ('trust-3','When You''re Scared','A gentler way to ask for reassurance.', 3),
  ('trust-4','Owning Our Stories','The histories we each brought in.', 4),
  ('trust-5','The Forgiveness Practice','A four-step ritual for letting something go.', 5),
  ('trust-6','Future Tense','Trust each other with what comes next.', 6)
) AS c(slug,title,summary,position);

-- Steps for every chapter (4 steps each = 48 total, mix of solo + couple)
-- Generic template steps per chapter, made meaningful via teaching/prompt
DO $$
DECLARE
  ch RECORD;
  step_data TEXT[][] := ARRAY[
    -- Each row: kind, teaching, prompt, ritual
    ARRAY['solo','Most of what we call listening is rehearsing our reply. Today, just notice the impulse to respond.','Write about one moment today you stopped yourself from interrupting. What did you almost say?','Practice a single 60-second pause in a conversation today.'],
    ARRAY['couple','Curiosity is a posture, not a script. Ask without an agenda.','Each of you ask the other a question with no follow-up. Just receive the answer. Share what you heard.','Sit facing each other for two minutes after.'],
    ARRAY['solo','Naming feelings precisely reduces their charge by roughly 25%, research suggests. Specificity is mercy.','What you''re actually feeling right now, in three different words. Not ''fine.''',NULL],
    ARRAY['couple','Repair is small, frequent, and undramatic. The ratio that matters is 5 small returns to 1 small rupture.','Share one small thing that pinched this week, and one small thing you appreciated. Trade.','End with a 20-second hug — long enough for nervous systems to settle.']
  ];
  i INT;
BEGIN
  FOR ch IN SELECT id FROM public.quest_chapters ORDER BY position LOOP
    FOR i IN 1..4 LOOP
      INSERT INTO public.quest_steps (chapter_id, position, kind, teaching, prompt, ritual, xp_reward)
      VALUES (
        ch.id, i,
        step_data[i][1]::public.quest_step_kind,
        step_data[i][2],
        step_data[i][3],
        step_data[i][4],
        CASE WHEN step_data[i][1]='couple' THEN 120 ELSE 80 END
      );
    END LOOP;
  END LOOP;
END $$;

-- =========================================================================
-- SEED: INSIGHTS (10 short reads)
-- =========================================================================
INSERT INTO public.insights (slug, title, subtitle, body, read_minutes, tags, position) VALUES
('5-to-1','The 5-to-1 ratio','Why small kindnesses matter more than big gestures.','Decades of research from the Gottman Institute found that stable couples have a 5:1 ratio of positive to negative interactions. Five small kindnesses for every small friction. The math is forgiving — but only if the deposits are real.', 2, ARRAY['research','daily'], 1),
('soft-startup','The first 30 seconds','How hard conversations begin determines how they end.','Studies show the first three minutes of a difficult conversation predict its outcome with 96% accuracy. A soft start — no blame, no accusation, just "I" statements — flips the whole script.', 2, ARRAY['communication'], 2),
('bids','The bid for connection','The tiny invitations we miss.','A bid is any small attempt at connection: a sigh, a glance, a "look at this." Turning toward bids — even acknowledging them — predicts relationship longevity better than almost any other measure.', 2, ARRAY['attention'], 3),
('repair','Repair is everything','Healthy couples don''t avoid conflict — they repair it.','The ability to come back, gently, after a moment of friction is the single strongest predictor of long-term satisfaction. Repair attempts can be a joke, a soft touch, or "let me try that again."', 2, ARRAY['conflict'], 4),
('attachment','Attachment styles, lightly','A short map of how we ask for love.','Most of us lean secure, anxious, or avoidant — usually some blend. Knowing your shape isn''t a diagnosis. It''s a vocabulary for explaining the moves you make when you''re scared.', 3, ARRAY['attachment'], 5),
('rituals','Rituals of connection','The quiet glue of long love.','Daily, weekly, and annual rituals — coffee together, Friday walks, anniversary letters — outperform big trips and grand gestures over a lifetime. They build a private culture of two.', 2, ARRAY['rituals'], 6),
('positive-sentiment','Positive sentiment override','When good will pays interest.','Couples in a positive sentiment override read ambiguous moments charitably. The same dropped tone gets heard as tiredness, not contempt. Earn this with small daily deposits.', 2, ARRAY['mindset'], 7),
('contempt','The one to avoid','Contempt is the strongest predictor of separation.','Sarcasm, eye-rolling, mockery — these don''t just sting; they corrode. Replace contempt with appreciation, even when you''re annoyed. Especially when you''re annoyed.', 2, ARRAY['conflict'], 8),
('love-languages','Beyond love languages','A nuance the original framework misses.','Most people have a primary love language — but it shifts under stress. When we''re scared we often reach for the language we needed as kids, not the one our partner usually speaks. Translation is the work.', 2, ARRAY['attachment','love-languages'], 9),
('time','Six hours a week','The minimum dose of intentional time.','Research suggests roughly six hours per week of intentional, undistracted partner time keeps satisfaction high. That''s a daily check-in, a real goodbye and hello, a weekly date, and a Sunday wind-down. It adds up.', 3, ARRAY['rituals','time'], 10);
