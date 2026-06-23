import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { XP_FOR, localToday, daysBetween } from "@/lib/xp";

export const listQuests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: cats }, { data: chapters }, { data: steps }, { data: completions }] = await Promise.all([
      supabase.from("quest_categories").select("*").order("position"),
      supabase.from("quest_chapters").select("*").order("position"),
      supabase.from("quest_steps").select("id, chapter_id, position, kind, xp_reward").order("position"),
      supabase.from("quest_step_completions").select("step_id").eq("user_id", userId),
    ]);
    const done = new Set((completions ?? []).map(c => c.step_id));
    const chaptersWithProgress = (chapters ?? []).map(ch => {
      const chSteps = (steps ?? []).filter(s => s.chapter_id === ch.id);
      const completed = chSteps.filter(s => done.has(s.id)).length;
      return { ...ch, total: chSteps.length, completed };
    });
    return { categories: cats ?? [], chapters: chaptersWithProgress };
  });

export const getChapter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: ch } = await supabase
      .from("quest_chapters").select("*").eq("slug", data.slug).maybeSingle();
    if (!ch) throw new Error("Chapter not found");
    const { data: cat } = await supabase
      .from("quest_categories").select("*").eq("id", ch.category_id).maybeSingle();
    const { data: steps } = await supabase
      .from("quest_steps").select("*").eq("chapter_id", ch.id).order("position");
    const { data: completions } = await supabase
      .from("quest_step_completions").select("step_id, created_at, body")
      .eq("user_id", userId)
      .in("step_id", (steps ?? []).map(s => s.id));
    const done = new Map((completions ?? []).map(c => [c.step_id, c]));
    return {
      chapter: ch, category: cat,
      steps: (steps ?? []).map(s => ({ ...s, completion: done.get(s.id) ?? null })),
    };
  });

export const completeStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    stepId: z.string().uuid(),
    body: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabase
      .from("quest_step_completions").select("id")
      .eq("user_id", userId).eq("step_id", data.stepId).maybeSingle();

    const { data: profile } = await supabase
      .from("profiles").select("current_couple_id, timezone").eq("id", userId).maybeSingle();
    const userTz = (profile as any)?.timezone ?? "UTC";

    const { data: step } = await supabase
      .from("quest_steps").select("kind, xp_reward, chapter_id").eq("id", data.stepId).maybeSingle();

    let alreadyCompleted = false;
    if (existing) {
      alreadyCompleted = true;
    } else {
      await supabase.from("quest_step_completions").insert({
        user_id: userId,
        couple_id: profile?.current_couple_id ?? null,
        step_id: data.stepId,
        body: data.body ?? null,
      });

      const amount = step?.xp_reward ?? (step?.kind === "couple" ? XP_FOR.quest_step_couple : XP_FOR.quest_step_solo);
      const { error: xpError } = await supabaseAdmin.from("xp_events").upsert({
        user_id: userId,
        couple_id: profile?.current_couple_id ?? null,
        kind: "quest_step", amount, ref_id: data.stepId,
        dedupe_key: `quest_step:${data.stepId}`,
      }, { onConflict: "user_id,kind,dedupe_key", ignoreDuplicates: true });
      if (xpError) {
        console.error("[xp_events] quest_step upsert failed", xpError);
        throw new Error(`XP write failed: ${xpError.message}`);
      }

      const today = localToday(userTz);
      const { data: us } = await supabaseAdmin
        .from("user_streaks").select("*").eq("user_id", userId).maybeSingle();
      if (us && us.last_active_date !== today) {
        const diff = us.last_active_date ? daysBetween(us.last_active_date, today) : null;
        let freezes = us.freezes_available ?? 0;
        let newStreak = 1;
        if (diff === 1) newStreak = (us.current_streak ?? 0) + 1;
        else if (diff === 2 && freezes > 0) { newStreak = (us.current_streak ?? 0) + 1; freezes -= 1; }
        await supabaseAdmin.from("user_streaks").update({
          current_streak: newStreak,
          longest_streak: Math.max(us.longest_streak ?? 0, newStreak),
          last_active_date: today,
          freezes_available: freezes,
        }).eq("user_id", userId);
      }
    }

    let chapterComplete = false;
    let chapterTitle: string | null = null;
    if (step?.chapter_id) {
      const [{ data: chSteps }, { data: chDone }, { data: chRow }] = await Promise.all([
        supabase.from("quest_steps").select("id").eq("chapter_id", step.chapter_id),
        supabase.from("quest_step_completions").select("step_id").eq("user_id", userId),
        supabase.from("quest_chapters").select("title").eq("id", step.chapter_id).maybeSingle(),
      ]);
      const doneSet = new Set((chDone ?? []).map(c => c.step_id));
      chapterComplete = (chSteps ?? []).every(s => doneSet.has(s.id));
      chapterTitle = chRow?.title ?? null;
    }

    return { ok: true, alreadyCompleted, chapterComplete, chapterTitle };
  });

export const listInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("insights").select("*").order("position");
    return { insights: data ?? [] };
  });

export const getInsight = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: insight } = await context.supabase
      .from("insights").select("*").eq("slug", data.slug).maybeSingle();
    if (!insight) throw new Error("Field note not found");
    return { insight };
  });
