import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { XP_FOR, promptPositionFor, todayUTC, localToday, daysSinceUTC } from "@/lib/xp";

// One unified server fn returning everything Home needs.
export const getHomeState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const promptToday = todayUTC();

    // profile + ensure user_streaks row exists
    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", userId).maybeSingle();
    await supabaseAdmin.from("user_streaks").upsert({ user_id: userId }, { onConflict: "user_id" });

    const userTz = (profile as { timezone?: string | null } | null)?.timezone ?? "UTC";
    const userLocalToday = localToday(userTz);

    // Parallel batch 1: streak, xp total (own) via aggregate RPC
    const [{ data: userStreak }, { data: xpTotalRpc }] = await Promise.all([
      supabase.from("user_streaks").select("*").eq("user_id", userId).maybeSingle(),
      supabase.rpc("user_total_xp", { _user_id: userId }),
    ]);
    const totalXp = Number(xpTotalRpc ?? 0);

    if (!profile?.current_couple_id) {
      return {
        kind: "unpaired" as const,
        profile, totalXp,
        userStreak: userStreak ?? null,
        today: promptToday,
        userLocalToday,
      };
    }

    const coupleId = profile.current_couple_id;

    // Parallel batch 2: couple, members, couple-streak upsert
    await supabaseAdmin.from("couple_streaks").upsert({ couple_id: coupleId }, { onConflict: "couple_id" });
    const [{ data: couple }, { data: members }, { data: coupleStreak }] = await Promise.all([
      supabase.from("couples").select("*").eq("id", coupleId).maybeSingle(),
      supabase.from("couple_members").select("user_id").eq("couple_id", coupleId),
      supabase.from("couple_streaks").select("*").eq("couple_id", coupleId).maybeSingle(),
    ]);
    const partnerId = (members ?? []).find(m => m.user_id !== userId)?.user_id ?? null;

    const position = couple ? promptPositionFor(couple.created_at as string, promptToday) : 1;

    // 14-day rhythm window — oldest first (index 0) → newest (index 13 = today)
    const rhythmStart = new Date();
    rhythmStart.setUTCDate(rhythmStart.getUTCDate() - 13);
    const rhythmStartISO = rhythmStart.toISOString().slice(0, 10);

    // Parallel batch 3
    const [
      partnerRes,
      pendingInviteRes,
      promptRes,
      myResponseRes,
      partnerResponseCountRes,
      partnerResponseAuthRes,
      soloTodayRes,
      partnerXpRes,
      lettersRes,
      completionsRes,
      chaptersRes,
      allStepsRes,
      goalsRes,
      myRhythmRes,
      partnerRhythmRes,
      mySoloRhythmRes,
    ] = await Promise.all([
      partnerId
        ? supabase.from("profiles").select("id, display_name, avatar_url").eq("id", partnerId).maybeSingle()
        : Promise.resolve({ data: null }),
      !partnerId
        ? supabase.from("invites").select("code").eq("couple_id", coupleId).is("used_by", null)
            .order("created_at", { ascending: false }).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("daily_prompts").select("*").eq("position", position).maybeSingle(),
      supabase.from("daily_responses").select("*")
        .eq("couple_id", coupleId).eq("prompt_date", promptToday).eq("user_id", userId).maybeSingle(),
      // Service-role count of partner rows: tells us "sealed" without leaking body
      partnerId
        ? supabaseAdmin.from("daily_responses").select("id", { count: "exact", head: true })
            .eq("couple_id", coupleId).eq("prompt_date", promptToday).eq("user_id", partnerId)
        : Promise.resolve({ count: 0 }),
      // The actual partner row — RLS only returns it once both submitted
      partnerId
        ? supabase.from("daily_responses").select("*")
            .eq("couple_id", coupleId).eq("prompt_date", promptToday).eq("user_id", partnerId).maybeSingle()
        : Promise.resolve({ data: null }),
      // A6: solo reflections are dated in the author's local timezone so
      // late-night entries count toward the local day, matching streaks.
      supabase.from("solo_reflections").select("id, body")
        .eq("user_id", userId).eq("prompt_date", userLocalToday).maybeSingle(),
      partnerId
        ? supabase.rpc("user_total_xp", { _user_id: partnerId })
        : Promise.resolve({ data: 0 }),
      supabase.from("letters").select("*").eq("couple_id", coupleId)
        .order("created_at", { ascending: false }).limit(20),
      supabase.from("quest_step_completions").select("step_id").eq("user_id", userId),
      supabase.from("quest_chapters").select("id, slug, title, position, is_advanced").order("position"),
      // A1: load all steps once, sort in-memory by chapter then position.
      supabase.from("quest_steps").select("id, chapter_id, position, teaching, prompt, kind"),
      supabase.from("couple_goals").select("goal").eq("couple_id", coupleId),
      // Rhythm: who contributed each of the last 14 days. Service-role for the
      // partner so we can read daily-response presence-only without leaking
      // response bodies. Partner solo reflections are intentionally NOT read
      // here — solo reflections are private to the author.
      supabaseAdmin.from("daily_responses").select("prompt_date")
        .eq("couple_id", coupleId).eq("user_id", userId).gte("prompt_date", rhythmStartISO),
      partnerId
        ? supabaseAdmin.from("daily_responses").select("prompt_date")
            .eq("couple_id", coupleId).eq("user_id", partnerId).gte("prompt_date", rhythmStartISO)
        : Promise.resolve({ data: [] }),
      supabase.from("solo_reflections").select("prompt_date")
        .eq("user_id", userId).gte("prompt_date", rhythmStartISO),
    ]);

    // Couple-level progress (shared XP + shared days + unlock state).
    const { computeCoupleProgress } = await import("@/lib/coupleLevel");
    const [{ data: coupleXp }, { data: sharedDays }, { data: entRows }] = await Promise.all([
      supabase.rpc("couple_total_xp", { _couple_id: coupleId }),
      supabase.rpc("couple_shared_days", { _couple_id: coupleId }),
      supabase.from("couple_entitlements")
        .select("product, status").eq("couple_id", coupleId).eq("status", "active"),
    ]);
    const paidSet = new Set((entRows ?? []).map(r => r.product as string));
    const coupleProgress = computeCoupleProgress(
      Number(coupleXp ?? 0),
      Number(sharedDays ?? 0),
      { time_capsule: paidSet.has("time_capsule"), the_atlas: paidSet.has("the_atlas") },
    );

    const partner = (partnerRes.data as any) ?? null;
    const pendingInvite = (pendingInviteRes.data as any) ?? null;
    const prompt = promptRes.data ?? null;
    const myResponse = myResponseRes.data ?? null;
    const partnerHasSubmitted = ((partnerResponseCountRes as any)?.count ?? 0) > 0;
    const partnerResponseRaw = partnerResponseAuthRes.data ?? null;

    // 48h auto-unseal: if I submitted >=48h ago and partner still hasn't, open
    // the reveal anyway so the seal isn't a dead-end. Body remains null when
    // the partner didn't write one.
    const myCreatedAt = (myResponse as any)?.created_at ? new Date((myResponse as any).created_at).getTime() : null;
    const autoUnsealed =
      !!myResponse && !partnerHasSubmitted && !!myCreatedAt && (Date.now() - myCreatedAt) >= 48 * 3600 * 1000;

    // Defense in depth — body only when both submitted and we have our row.
    const partnerResponse = myResponse && partnerResponseRaw
      ? partnerResponseRaw
      : (partnerHasSubmitted
          ? { id: null as string | null, user_id: partnerId, body: null as string | null, sealed: true }
          : (autoUnsealed
              ? { id: null as string | null, user_id: partnerId, body: null as string | null, sealed: false, missed: true }
              : null));

    const partnerTotalXp = Number((partnerXpRes as { data: number | null }).data ?? 0);

    // A1: find next quest step with one in-memory scan instead of N queries.
    const completedSet = new Set((completionsRes.data ?? []).map((c: { step_id: string }) => c.step_id));
    type StepRow = { id: string; chapter_id: string; position: number; teaching: string; prompt: string; kind: string };
    const stepsByChapter = new Map<string, StepRow[]>();
    for (const s of (allStepsRes.data ?? []) as StepRow[]) {
      const arr = stepsByChapter.get(s.chapter_id) ?? [];
      arr.push(s);
      stepsByChapter.set(s.chapter_id, arr);
    }
    let nextStep: {
      chapterSlug: string; chapterTitle: string; stepId: string;
      position: number; teaching: string; prompt: string; kind: string;
    } | null = null;
    for (const ch of (chaptersRes.data ?? []) as Array<{ id: string; slug: string; title: string }>) {
      const steps = (stepsByChapter.get(ch.id) ?? []).slice().sort((a, b) => a.position - b.position);
      const inc = steps.find(s => !completedSet.has(s.id));
      if (inc) {
        nextStep = {
          chapterSlug: ch.slug, chapterTitle: ch.title, stepId: inc.id,
          position: inc.position, teaching: inc.teaching, prompt: inc.prompt, kind: inc.kind,
        };
        break;
      }
    }

    const daysTogether = couple?.paired_at
      ? daysSinceUTC((couple.paired_at as string).slice(0, 10), promptToday) + 1
      : (couple?.created_at ? daysSinceUTC((couple.created_at as string).slice(0, 10), promptToday) + 1 : 1);

    // Build the 14-day rhythm. "Contributed" = either a daily response OR a
    // solo reflection that day. Honest cadence, not a streak.
    const mineDays = new Set([
      ...((myRhythmRes.data ?? []) as { prompt_date: string }[]).map(r => r.prompt_date),
      ...((mySoloRhythmRes.data ?? []) as { prompt_date: string }[]).map(r => r.prompt_date),
    ]);
    const theirsDays = new Set(
      ((partnerRhythmRes.data ?? []) as { prompt_date: string }[]).map(r => r.prompt_date),
    );
    const rhythm: ("both" | "mine" | "theirs" | "empty")[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const m = mineDays.has(iso);
      const t = theirsDays.has(iso);
      rhythm.push(m && t ? "both" : m ? "mine" : t ? "theirs" : "empty");
    }

    return {
      kind: "paired" as const,
      profile, couple, partner, pendingInvite,
      prompt, myResponse, partnerResponse,
      partnerHasSubmitted,
      autoUnsealed,
      soloToday: soloTodayRes.data ?? null,
      userStreak: userStreak ?? null,
      coupleStreak: coupleStreak ?? null,
      totalXp, partnerTotalXp,
      letters: lettersRes.data ?? [],
      nextStep,
      goals: ((goalsRes.data ?? []) as { goal: string }[]).map(g => g.goal),
      today: promptToday,
      userLocalToday,
      daysTogether,
      rhythm,
    };
  });

// Submit my daily response. Idempotent XP via dedupe_key.
export const submitDailyResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    promptId: z.string().uuid(),
    body: z.string().min(1).max(1000),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { advanceUserStreak, maybeAdvanceCoupleStreak } = await import("@/lib/streak.server");
    const promptDate = todayUTC();

    const { data: profile } = await supabase
      .from("profiles").select("current_couple_id, timezone").eq("id", userId).maybeSingle();
    if (!profile?.current_couple_id) throw new Error("You're not in a couple yet.");
    const coupleId = profile.current_couple_id;
    const userTz = (profile as { timezone?: string | null }).timezone ?? "UTC";

    const { error } = await supabase.from("daily_responses").upsert({
      couple_id: coupleId, user_id: userId,
      prompt_id: data.promptId, prompt_date: promptDate,
      body: data.body.trim(),
    }, { onConflict: "couple_id,user_id,prompt_date" });
    if (error) throw new Error(error.message);

    const { error: dailyXpError } = await supabaseAdmin.from("xp_events").upsert({
      user_id: userId, couple_id: coupleId,
      kind: "daily", amount: XP_FOR.daily, ref_id: data.promptId,
      dedupe_key: `daily:${promptDate}`,
    }, { onConflict: "user_id,kind,dedupe_key", ignoreDuplicates: true });
    if (dailyXpError) {
      console.error("[xp_events] daily upsert failed", dailyXpError);
      throw new Error(`XP write failed: ${dailyXpError.message}`);
    }

    await advanceUserStreak(supabaseAdmin, userId, userTz);
    await maybeAdvanceCoupleStreak(supabaseAdmin, coupleId, promptDate);

    return { ok: true };
  });

export const submitSoloReflection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    promptId: z.string().uuid().nullable(),
    body: z.string().min(1).max(2000),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { advanceUserStreak, maybeAdvanceCoupleStreak } = await import("@/lib/streak.server");

    const { data: profile } = await supabase
      .from("profiles").select("current_couple_id, timezone").eq("id", userId).maybeSingle();
    const userTz = (profile as { timezone?: string | null } | null)?.timezone ?? "UTC";
    // A6: date reflections by the author's local day so streaks line up.
    const promptDate = localToday(userTz);

    const { data: existing } = await supabase
      .from("solo_reflections").select("id")
      .eq("user_id", userId).eq("prompt_date", promptDate).maybeSingle();
    if (existing) {
      await supabase.from("solo_reflections").update({ body: data.body.trim() }).eq("id", existing.id);
    } else {
      await supabase.from("solo_reflections").insert({
        user_id: userId, prompt_date: promptDate,
        parent_prompt_id: data.promptId, body: data.body.trim(),
      });
      const { error: soloXpError } = await supabaseAdmin.from("xp_events").upsert({
        user_id: userId, kind: "solo_reflection", amount: XP_FOR.solo_reflection,
        dedupe_key: `solo:${promptDate}`,
      }, { onConflict: "user_id,kind,dedupe_key", ignoreDuplicates: true });
      if (soloXpError) {
        console.error("[xp_events] solo_reflection upsert failed", soloXpError);
        throw new Error(`XP write failed: ${soloXpError.message}`);
      }
    }

    await advanceUserStreak(supabaseAdmin, userId, userTz);
    if (profile?.current_couple_id) {
      await maybeAdvanceCoupleStreak(supabaseAdmin, profile.current_couple_id, promptDate);
    }
    return { ok: true };
  });

// Streak helpers live in @/lib/streak.server and are imported lazily by
// the handlers above to avoid leaking server-only code into the client bundle.
