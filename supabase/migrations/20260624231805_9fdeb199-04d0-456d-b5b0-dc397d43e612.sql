
-- Seed five new advanced quest categories with chapters + 4 steps each.
-- All chapters are flagged is_advanced = true so the existing UI greys them
-- out until couple_unlocked(_couple_id, 'quests_advanced') returns true.

INSERT INTO public.quest_categories (slug, title, subtitle, accent, position) VALUES
  ('intimacy',             'Intimacy',                         'The language of closeness',            'rust', 3),
  ('aftercare-arguments',  'Aftercare: After Arguments',       'Returning to each other',              'clay', 4),
  ('aftercare-closeness',  'Aftercare: Closeness & Reassurance','The quiet hour after',                'rust', 5),
  ('conflict-repair',      'Conflict & Repair',                'The shape of a hard conversation',     'clay', 6),
  ('desire-curiosity',     'Desire & Curiosity',               'Staying interested in each other',     'rust', 7)
ON CONFLICT (slug) DO NOTHING;

-- INTIMACY
WITH cat AS (SELECT id FROM public.quest_categories WHERE slug='intimacy')
INSERT INTO public.quest_chapters (category_id, slug, title, summary, position, is_advanced)
SELECT cat.id, c.slug, c.title, c.summary, c.position, true FROM cat, (VALUES
  ('intimacy-1','Touch, Without Errand','Closeness that isn''t going anywhere.', 1),
  ('intimacy-2','The Eye-Contact Minute','Two minutes. No words. Just looking.', 2),
  ('intimacy-3','Naming What You Want','Practice the ask, gently and out loud.', 3),
  ('intimacy-4','Pleasure As Information','What your body is trying to tell you.', 4),
  ('intimacy-5','The Slow Return','Re-finding each other after distance.', 5)
) AS c(slug,title,summary,position)
ON CONFLICT (slug) DO NOTHING;

-- AFTERCARE: AFTER ARGUMENTS
WITH cat AS (SELECT id FROM public.quest_categories WHERE slug='aftercare-arguments')
INSERT INTO public.quest_chapters (category_id, slug, title, summary, position, is_advanced)
SELECT cat.id, c.slug, c.title, c.summary, c.position, true FROM cat, (VALUES
  ('aftarg-1','The 20-Minute Cooldown','What to do with the gap.', 1),
  ('aftarg-2','The First Sentence Back','A few phrases for re-entry.', 2),
  ('aftarg-3','Repair Without Re-litigating','Closing the loop without reopening it.', 3),
  ('aftarg-4','The Body Check-In','Nervous systems before words.', 4),
  ('aftarg-5','What We Learned','Turning rupture into a small agreement.', 5)
) AS c(slug,title,summary,position)
ON CONFLICT (slug) DO NOTHING;

-- AFTERCARE: CLOSENESS & REASSURANCE
WITH cat AS (SELECT id FROM public.quest_categories WHERE slug='aftercare-closeness')
INSERT INTO public.quest_chapters (category_id, slug, title, summary, position, is_advanced)
SELECT cat.id, c.slug, c.title, c.summary, c.position, true FROM cat, (VALUES
  ('aftclose-1','The Reassurance Ritual','The words that actually land.', 1),
  ('aftclose-2','Holding, Not Fixing','Being a steady presence.', 2),
  ('aftclose-3','Tender Questions','What to ask when they''re soft.', 3),
  ('aftclose-4','The Comfort Inventory','Each partner''s specific comforts.', 4),
  ('aftclose-5','A Hand on the Back','Small physical anchors.', 5)
) AS c(slug,title,summary,position)
ON CONFLICT (slug) DO NOTHING;

-- CONFLICT & REPAIR
WITH cat AS (SELECT id FROM public.quest_categories WHERE slug='conflict-repair')
INSERT INTO public.quest_chapters (category_id, slug, title, summary, position, is_advanced)
SELECT cat.id, c.slug, c.title, c.summary, c.position, true FROM cat, (VALUES
  ('conf-1','Naming the Pattern','Your couple''s recurring loop.', 1),
  ('conf-2','The Pause Word','A shared signal to slow down.', 2),
  ('conf-3','Owning Your 10%','Your part, without flattening theirs.', 3),
  ('conf-4','Apologies That Land','The four parts of a real apology.', 4),
  ('conf-5','The Weekly Clearing','A 20-minute housekeeping ritual.', 5)
) AS c(slug,title,summary,position)
ON CONFLICT (slug) DO NOTHING;

-- DESIRE & CURIOSITY
WITH cat AS (SELECT id FROM public.quest_categories WHERE slug='desire-curiosity')
INSERT INTO public.quest_chapters (category_id, slug, title, summary, position, is_advanced)
SELECT cat.id, c.slug, c.title, c.summary, c.position, true FROM cat, (VALUES
  ('desire-1','The Question You''ve Never Asked','One new thing this week.', 1),
  ('desire-2','Erotic Curiosity','Desire as exploration, not performance.', 2),
  ('desire-3','The Future-Self Letter','Who you''re each becoming.', 3),
  ('desire-4','Small Mysteries','Protecting some unknown in each other.', 4),
  ('desire-5','The Re-Meeting','Meeting your partner as a stranger for an evening.', 5)
) AS c(slug,title,summary,position)
ON CONFLICT (slug) DO NOTHING;

-- Seed 4 steps per new chapter (solo, couple, solo, couple) tuned per chapter.
DO $$
DECLARE
  ch RECORD;
  steps JSONB := '{
    "intimacy-1": [
      ["solo","Closeness doesn''t need a destination. Notice when touch becomes a task.","Write about one moment today you touched your partner without wanting anything from it.",null],
      ["couple","Try ten minutes of contact with no goal — hand on a shoulder, leaning in. Then talk about what shifted.","Sit together with one point of contact for ten minutes. After, share what changed in your body.","No screens during the ten minutes."],
      ["solo","Wanting closeness and wanting sex are different needs. Both are honest.","What kind of closeness do you most need this week, and how would you ask for it?",null],
      ["couple","Make a small request of each other. Receive it without negotiating.","Each of you ask for one small form of closeness tonight. Trade.","End with a long, quiet hug."]
    ],
    "intimacy-2": [
      ["solo","Eye contact is exposure. It''s also one of the fastest ways to feel seen.","What do you brace against when someone really looks at you?",null],
      ["couple","Two minutes of eye contact. No speaking. Notice the urge to laugh, look away, perform.","Sit knee to knee. Two minutes of eye contact. After, each of you say one sentence about what you saw.","Set a timer so neither of you has to track."],
      ["solo","What you saw in their face is information. So is what you wanted them to see in yours.","One thing you saw in your partner''s face you''d never quite noticed before.",null],
      ["couple","Do it once more, shorter. See if anything is different the second time.","One more minute of eye contact. Then, in one sentence each, name what felt different.","Hands on each other''s knees while you do it."]
    ],
    "intimacy-3": [
      ["solo","Most unspoken wants stay unspoken because we''re afraid the asking changes things.","One small thing you''ve wanted from your partner and not asked for. Why haven''t you asked?",null],
      ["couple","Trade one small want each. Receive it without solving.","Each of you name one small want — emotional, physical, logistical. The other repeats it back, no fix.","No discussion of feasibility tonight. Just naming."],
      ["solo","Asking is a skill. So is receiving an ask without reading it as criticism.","How does it feel when your partner asks for something? What does the ask sound like at its best?",null],
      ["couple","Practice receiving. The goal isn''t to agree — it''s to make the ask safe to make again.","Take turns saying ''I hear you'' to the want from step 2. Then say what feels possible, and what doesn''t.","Hand on heart while listening."]
    ],
    "intimacy-4": [
      ["solo","Your body keeps a fairly accurate ledger of what feels good and what doesn''t. Most of us ignore it.","What''s one thing your body has been trying to tell you about pleasure or comfort this month?",null],
      ["couple","Trade one thing that genuinely feels good — physically, sensorially, anywhere on the spectrum.","Each of you share one specific thing that brings your body pleasure or ease. Listen without commentary.","Lights low while you talk."],
      ["solo","Pleasure isn''t a reward you earn. It''s information about what you''re built for.","One pleasure you''ve been treating as optional or earned. What would change if it were just allowed?",null],
      ["couple","Plan one small thing this week that''s purely about one of your bodies feeling good.","Together, pick one small pleasure-thing to do this week. Put it on the calendar now.","Toast it with whatever''s in the fridge."]
    ],
    "intimacy-5": [
      ["solo","Distance happens. Re-finding each other is a practice, not a panic.","Write about a time you''d drifted from each other and how the return started. Who moved first?",null],
      ["couple","Name where you''ve felt distance this month. Quietly, without blame.","Each of you say where you''ve felt distance — without explaining or defending. The other says ''thank you for telling me.''","Sit shoulder to shoulder, not face to face, for this one."],
      ["solo","Closeness rebuilds in small returns, not grand gestures.","Three small returns you could make this week — a text, a touch, a question. Pick one.",null],
      ["couple","Trade your one small return. Do them this week.","Tell each other the small return you''re going to make. Then do it within 48 hours.","Seal it with a long hug."]
    ],
    "aftarg-1": [
      ["solo","The 20 minutes after escalation is when your body is still flooded. Decisions made here aren''t real decisions.","What does your body do in the first 20 minutes after an argument? Where do you feel it?",null],
      ["couple","Agree on what a cooldown looks like for you both — separate rooms, a walk, water, nothing.","Decide together: what''s our cooldown? Where do we go, how long, and what''s the signal we''re ready to come back?","Write it on a sticky note for next time."],
      ["solo","Cooldown is not punishment or stonewalling. Name the difference for yourself.","What''s the difference between cooling down and shutting your partner out? How would they know which one you''re doing?",null],
      ["couple","Practice the cooldown signal once, calmly, before you need it.","Run the cooldown plan once tonight as a drill. Walk away, come back, hug. So your bodies know the shape.","End by saying ''we''re still on the same team.''"]
    ],
    "aftarg-2": [
      ["solo","The first sentence after a fight sets the tone. It''s easier to write it ahead.","Draft three first-sentences-back you could use. Honest, not performative.",null],
      ["couple","Share the first sentences you each wrote. Pick one or two you''d like to hear.","Trade your drafted first sentences. Tell each other which ones you''d most want to hear.","No critique of the sentences. Just preferences."],
      ["solo","The first sentence is rarely about the content of the fight. It''s about repair.","What do you actually need the first sentence to communicate? (E.g. ''I''m still here.'' ''I love you.'' ''I''m sorry I got loud.'')",null],
      ["couple","Agree on a default first sentence for the next rupture. You can always do better — but never worse.","Pick one default first sentence together. Write it down. Use it next time, no matter what.","A small hug to close."]
    ],
    "aftarg-3": [
      ["solo","Re-opening the fight to ''get it right'' usually re-injures both of you.","Recall a time you re-litigated something. What were you actually hoping for that you didn''t get the first time?",null],
      ["couple","Name one unfinished thing from a recent fight — without re-arguing it.","Each of you name one piece of a past argument that still feels unresolved. The other reflects it back, no defense.","Hands held while you do this."],
      ["solo","''Closing the loop'' means each person feels heard, not that each person was right.","What would it take for that unfinished thing to feel closed for you? (Not won — closed.)",null],
      ["couple","Trade what would close the loop. Offer what you can.","Tell each other what would close the loop. Then say what you can honestly offer toward that.","End with ''I''m glad we''re talking about this.''"]
    ],
    "aftarg-4": [
      ["solo","Talking is hard when your body is still in fight-or-flight. Settling first is not avoidance.","How do you know when your body has actually calmed? What''s the sign?",null],
      ["couple","Before the next hard talk, do a 2-minute body check-in together. Just regulate.","Try a 2-minute regulation now: slow breathing, feet on the floor, hand on chest, eyes closed. Then a single sentence each about what you notice.","Sit close enough to feel each other''s breathing."],
      ["solo","Naming what your body needs is more useful than naming what you''re angry about, in the first ten minutes.","A list of three things that help your nervous system settle. Share it later.",null],
      ["couple","Trade your regulation lists. Use them on each other.","Show each other your settling lists. Agree to try one of theirs the next time they''re activated.","Long exhale together to close."]
    ],
    "aftarg-5": [
      ["solo","A rupture is information. The lesson is usually small and specific.","What did the last hard moment teach you about what you each need? Be specific.",null],
      ["couple","Turn the lesson into one tiny shared agreement.","Together, name one tiny agreement that would prevent the same rupture next time. Tiny. Specific. Achievable.","Write it down where you''ll both see it."],
      ["solo","Agreements that stick are the ones that don''t require either person to become someone else.","Is the agreement realistic for the worst version of you, not just the best? If not, shrink it.",null],
      ["couple","Decide how you''ll check in on the agreement in two weeks.","Put a date on the calendar to check in on the agreement. Two weeks is enough.","Toast it with tea, water, anything."]
    ],
    "aftclose-1": [
      ["solo","The right reassurance is specific. ''It''s okay'' rarely is.","Write down three things you wish someone would say to you when you''re unsettled.",null],
      ["couple","Trade your reassurance phrases. Practice saying them.","Show each other your lists. Take turns saying the other person''s phrases out loud, slowly.","Hand on their hand while you say it."],
      ["solo","Reassurance isn''t about agreeing with the fear. It''s about being a present body next to it.","When you''re anxious, do you want words, touch, presence, or space? Be honest.",null],
      ["couple","Agree on a default reassurance script for the next hard night.","Pick one phrase each you''d like to hear the next time you''re shaky. Write them somewhere visible.","Close with a quiet hug."]
    ],
    "aftclose-2": [
      ["solo","''Holding'' is harder than fixing because it requires you to tolerate not solving.","When was the last time someone held space for you without fixing? What did they do?",null],
      ["couple","Tonight, one of you shares something heavy. The other only listens and stays close. No fixing.","Set a 10-minute timer. One partner shares. The other only listens, breathes, and stays close.","Swap roles tomorrow night."],
      ["solo","Notice the urge to fix. The urge is love. Just don''t act on it tonight.","What did it feel like to be held without being fixed? What did it feel like to hold?",null],
      ["couple","Name one situation this month where you want to be held, not fixed.","Each of you name an upcoming situation where you''d like to be held, not fixed. Promise the response.","Pinkie promise, if you''re that kind of couple."]
    ],
    "aftclose-3": [
      ["solo","Tender questions are different from useful questions. They don''t require an answer.","Write three tender questions you could ask your partner — not for information, just to be near them.",null],
      ["couple","Trade your tender questions tonight. Ask one. Then just sit with the answer.","Each of you ask one tender question. The other answers however they want. No follow-up questions.","Lights low while you do this."],
      ["solo","Some questions are meant to be carried, not solved.","Which of their answers will you carry with you this week?",null],
      ["couple","Pick a tender question you''ll bring back, monthly. Make it a small ritual.","Choose one tender question to ask each other once a month. Put it on the calendar.","Seal it with a forehead kiss."]
    ],
    "aftclose-4": [
      ["solo","Specific comforts are easier to give than vague ones. ''Tea, blanket, no TV'' is a gift.","Write your own comfort inventory. Five specific things that comfort you. Specific.",null],
      ["couple","Trade comfort inventories. Read each other''s aloud.","Show each other your inventories. Read them aloud. Ask one clarifying question each.","Put both lists on the fridge."],
      ["solo","Knowing your own comforts is half the practice. It means you can ask for them.","Which comfort on your list do you most often forget to give yourself?",null],
      ["couple","Give each other one comfort from the list this week, unasked.","Plan to give each other one comfort from the list this week — without being asked.","No keeping score."]
    ],
    "aftclose-5": [
      ["solo","Touch is regulation. A hand on the back can do what ten minutes of talking can''t.","Write about a moment when a small touch from your partner shifted everything for you.",null],
      ["couple","Choose one physical anchor — a touch you''ll use when one of you is overwhelmed.","Decide together on one anchoring touch (hand on back, foot on foot, hand on chest). Try it now.","Use it once this week, deliberately."],
      ["solo","The anchor only works if you trust it. Trust comes from practice.","What would make this touch feel like an anchor and not an obligation?",null],
      ["couple","Use the anchor in a non-crisis moment. Build the muscle memory.","Use your anchoring touch once today when nothing''s wrong. Just to teach your bodies the shape.","Smile about it after."]
    ],
    "conf-1": [
      ["solo","Most couples have two or three recurring fights wearing different costumes.","Write about your couple''s recurring fight. What''s under the surface content?",null],
      ["couple","Name the pattern together, gently. Not to win — to see it.","Each of you describe the recurring loop as you see it. Use ''we'' more than ''you.''","Sit side by side, not across."],
      ["solo","Naming the pattern doesn''t make it stop. It just makes it shareable.","What''s your typical role in the loop? What does your part look like at its worst?",null],
      ["couple","Decide on a name for the pattern. Naming it lets you point at it without restarting it.","Together, give the pattern a name. Something short. Use it next time it shows up.","Laugh about the name if you can."]
    ],
    "conf-2": [
      ["solo","A pause word is a circuit-breaker. It works because you agreed on it when calm.","What word or phrase could you both use to mean ''I need a moment''? Not a punishment word.",null],
      ["couple","Choose your pause word together. Practice it once now, calmly.","Pick a pause word. Use it once tonight in a non-charged moment, just to teach your nervous systems.","Write the word somewhere only you two will see."],
      ["solo","The pause word doesn''t end the conversation. It just slows the metabolism of it.","What''s the agreement about what happens after the pause word? When do you come back?",null],
      ["couple","Agree on the return: when, how, who restarts.","Decide what happens after the pause word: how long the break is, who comes back first, what the first sentence is.","Hug to close."]
    ],
    "conf-3": [
      ["solo","Owning your 10% is not admitting you were 100% wrong. It''s being honest about your part.","In your most recent rough moment, what was your 10%? Be specific.",null],
      ["couple","Trade your 10%s. No defending, no balancing the ledger.","Each of you say your own 10% from a recent rough moment. The other says ''thank you for naming that.'' That''s it.","No ''but''s tonight."],
      ["solo","Owning your part is contagious. So is refusing to.","What makes it hard for you to own your 10%? Pride? Fear of being made fully responsible?",null],
      ["couple","Agree to lead with 10% next time. Even when it feels unfair.","Make a small agreement: next conflict, each of you leads with your 10% before saying anything about theirs.","Pinkie on it."]
    ],
    "conf-4": [
      ["solo","An apology that lands has four parts: name the act, name the impact, take responsibility, and offer a change.","Write a four-part apology for something small you did this month. Practice the form.",null],
      ["couple","Deliver a real four-part apology to each other for something small.","Each of you give a four-part apology for something small. The other receives it without immediately apologizing back.","Hand on heart while delivering."],
      ["solo","''I''m sorry you felt that way'' is not a four-part apology. Notice if you tend to default there.","Which of the four parts is hardest for you? Why?",null],
      ["couple","Agree that next time, you''ll aim for all four parts. Not perfectly. Just deliberately.","Make the four-part apology your couple''s default form. Write the four parts somewhere you''ll both see.","Read them out loud together."]
    ],
    "conf-5": [
      ["solo","Weekly housekeeping prevents weekly explosions. The clearing is twenty minutes of small things.","Write down three small things from this week you''d bring to a clearing — pinches, appreciations, asks.",null],
      ["couple","Run a 20-minute clearing tonight. Pinches, appreciations, asks. Trade.","Set a 20-minute timer. Each of you shares one pinch, one appreciation, one small ask. Trade and listen.","Tea or wine. No phones."],
      ["solo","The clearing is most useful when neither of you is angry. It''s preventative care, not triage.","What time of week would the clearing fit your life? Pick the most boring, least romantic slot.",null],
      ["couple","Put the clearing on the calendar. Weekly. Same time.","Schedule the weekly clearing on the calendar now. Same day, same time, every week.","Hug to close."]
    ],
    "desire-1": [
      ["solo","After enough years, we stop asking the questions whose answers we think we know.","Write three questions you''ve never actually asked your partner. They can be small.",null],
      ["couple","Trade one of your never-asked questions tonight.","Each of you ask one never-asked question. Receive the answer without interrupting. Then say ''tell me more.''","Sit on the floor for this one if you can."],
      ["solo","The point isn''t the new fact. It''s noticing your partner is still becoming someone.","What was new in their answer? What did you assume you already knew?",null],
      ["couple","Decide on a monthly never-asked question habit. One question, one evening.","Schedule a monthly never-asked-question night. Same first week of every month.","Calendar it now."]
    ],
    "desire-2": [
      ["solo","Erotic curiosity is asking what you''re drawn to, not whether you''re performing well.","What are you curious about — sensually, erotically, relationally — that you''ve never said out loud?",null],
      ["couple","Trade one curiosity each. No commitment to act on it. Just say it out loud.","Each of you share one erotic or sensual curiosity. The other says ''thank you for telling me'' and asks one gentle question.","Lights low. No phones in the room."],
      ["solo","Saying a curiosity out loud doesn''t obligate either of you to anything.","What did it feel like to say it? What did it feel like to hear it?",null],
      ["couple","Agree on one small, low-stakes thing to explore — or just on the practice of saying these out loud monthly.","Either pick one small thing to try, or just agree to do this exchange again next month. Either is enough.","Hold hands for a minute after."]
    ],
    "desire-3": [
      ["solo","Writing about your future self is mostly for you. It tells your partner who you''re becoming.","Write a one-paragraph letter from your future self, three years out. What are they like? What did they grow into?",null],
      ["couple","Read your letters to each other.","Read your future-self letters aloud. The other only listens, then says one sentence about what they hope is true for that future self.","Sit close while reading."],
      ["solo","Your partner''s future self is partly being built tonight, by how you receive them now.","What in their future-self letter do you want to support? What in yours do you want their support for?",null],
      ["couple","Make one small concrete promise to each other''s future selves.","Each of you make one small concrete promise to the other''s future self. Tiny is fine.","Seal it with a slow exhale."]
    ],
    "desire-4": [
      ["solo","Some mystery is healthy. Knowing everything about each other is a fantasy, not a goal.","What''s one part of yourself you''d like to keep a little private — not hidden, just yours?",null],
      ["couple","Tell each other what you''d like to keep a little private. Honor it.","Trade what you''d each like to keep a little private. Receive without prying.","Just listening. No follow-up questions tonight."],
      ["solo","Protecting some unknown is generous, not avoidant. It leaves room to keep meeting them.","What mystery in your partner do you most enjoy not fully solving?",null],
      ["couple","Name one mystery in each other you want to protect.","Each of you name one thing about the other that you love not fully understanding. Toast to the unknown.","Whatever''s in the cupboard."]
    ],
    "desire-5": [
      ["solo","Meeting your partner as a stranger is just choosing not to skip the small noticing.","Plan a 90-minute window this week where you''ll act like you''re meeting them for the first time.",null],
      ["couple","Plan the re-meeting together. Decide where, when, the simple rules.","Pick the night for the re-meeting. Agree on the simple rules: dress nicely, no household talk, ask new questions.","Put it on the calendar now."],
      ["solo","The point isn''t to pretend. It''s to notice them with fresh eyes.","What''s one thing you''d want a stranger version of your partner to know about you?",null],
      ["couple","Do the re-meeting. Then debrief, gently.","Do the re-meeting this week. After, share one thing you noticed about each other you''d been missing.","One long kiss to close."]
    ]
  }'::jsonb;
  s JSONB;
  i INT;
BEGIN
  FOR ch IN
    SELECT id, slug FROM public.quest_chapters
    WHERE slug IN (
      SELECT jsonb_object_keys(steps)
    )
  LOOP
    FOR i IN 0..3 LOOP
      s := steps->ch.slug->i;
      INSERT INTO public.quest_steps (chapter_id, position, kind, teaching, prompt, ritual, xp_reward)
      VALUES (
        ch.id,
        i + 1,
        (s->>0)::public.quest_step_kind,
        s->>1,
        s->>2,
        NULLIF(s->>3, ''),
        CASE WHEN s->>0 = 'couple' THEN 120 ELSE 80 END
      )
      ON CONFLICT (chapter_id, position) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
