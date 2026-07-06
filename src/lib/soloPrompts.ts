// Rotating solo-reflection prompts. Deterministic by date so both a same-day
// reload and a partner's device (if they open their own reflection) land on
// the same prompt. Pool is intentionally small and evergreen — quiet,
// journal-friendly openings, no hype.

import { daysBetween } from "@/lib/xp";

export interface SoloPrompt {
  theme: string;
  body: string;
}

export const SOLO_PROMPT_POOL: SoloPrompt[] = [
  { theme: "Notice",     body: "What softened in you today, even a little?" },
  { theme: "Gratitude",  body: "Name one small thing you're grateful for — and why it landed." },
  { theme: "Body",       body: "Where is your body carrying tension right now? What might it be holding?" },
  { theme: "Truth",      body: "What's true for you today that you haven't said out loud?" },
  { theme: "Care",       body: "How did you take care of yourself today — or wish you had?" },
  { theme: "Attention",  body: "What did you give your attention to that was worth it?" },
  { theme: "Love",       body: "Who did you think of today, and what did you almost say to them?" },
  { theme: "Regret",     body: "Is there anything small you'd do differently if you got today back?" },
  { theme: "Wonder",     body: "What made you pause today, even for a second?" },
  { theme: "Fear",       body: "What are you quietly afraid of this week? Name it, gently." },
  { theme: "Hope",       body: "What are you quietly hoping for? Write it plainly." },
  { theme: "Anger",      body: "What's frustrating you lately — and what's underneath the frustration?" },
  { theme: "Rest",       body: "When did you last truly rest? What would help you rest tonight?" },
  { theme: "Growth",     body: "What did you learn about yourself this week?" },
  { theme: "Boundaries", body: "Where do you need to say 'no' or 'not yet' right now?" },
  { theme: "Craving",    body: "What are you craving more of in your life? Less of?" },
  { theme: "Memory",     body: "What memory surfaced today, uninvited? Sit with it a moment." },
  { theme: "Voice",      body: "If you could say one honest thing to someone today, what would it be?" },
  { theme: "Beauty",     body: "What was beautiful today — small, ordinary, easily missed?" },
  { theme: "Change",     body: "What's shifting in you lately? Even quietly." },
  { theme: "Forgive",    body: "Who — including yourself — are you working on forgiving?" },
  { theme: "Ask",        body: "What do you need help with, and who might you ask?" },
  { theme: "Enough",     body: "Where were you already enough today, without doing more?" },
  { theme: "Distance",   body: "Where do you feel a little disconnected — from a person, a place, yourself?" },
  { theme: "Return",     body: "What are you trying to return to lately? What pulls you back?" },
  { theme: "Wanting",    body: "What do you want right now that feels hard to admit?" },
  { theme: "Steady",     body: "What's keeping you steady this week? Name it so you don't lose sight of it." },
  { theme: "Grief",      body: "What loss — big or small — are you still carrying?" },
  { theme: "Joy",        body: "Where did joy sneak in today? Even a flicker counts." },
  { theme: "Tomorrow",   body: "What's one soft intention for tomorrow — not a task, a posture." },
];

// Epoch = 2024-01-01 so the pool is anchored and doesn't drift with tz math.
const EPOCH = "2024-01-01";

export function soloPromptFor(dateISO: string): SoloPrompt {
  const idx = Math.abs(daysBetween(EPOCH, dateISO)) % SOLO_PROMPT_POOL.length;
  return SOLO_PROMPT_POOL[idx]!;
}
