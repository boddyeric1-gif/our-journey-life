import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { XP_FOR } from "@/lib/xp";

const stage = z.enum(["dating", "engaged", "married", "long_term"]);
const love = z.enum(["words", "acts", "gifts", "time", "touch"]);

export const saveOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    displayName: z.string().min(1).max(60),
    stage,
    anniversary: z.string().nullable(),
    loveLanguage: love.nullable(),
    goals: z.array(z.string()).max(8).default([]),
    firstLetter: z.string().max(500).nullable(),
    timezone: z.string().max(64).optional(),
    journeyIntention: z.string().max(280).nullable().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Use the admin client for the profile write. The middleware has already
    // authenticated the caller (userId === auth.uid()), and onboarding fields
    // are not sensitive — subscription_tier is still protected by its column
    // grant + dedicated server flow. Going through admin here avoids the
    // silent 0-rows-affected mode of PostgREST PATCH when a column GRANT or
    // RLS edge case rejects part of the row, which previously left users
    // stranded with onboarded_at = NULL and bounced back to step 0.
    const { error: profileError, data: updatedProfile } = await supabaseAdmin
      .from("profiles")
      .update({
        display_name: data.displayName,
        relationship_stage: data.stage,
        anniversary: data.anniversary,
        love_language: data.loveLanguage,
        onboarded_at: new Date().toISOString(),
        ...(data.timezone ? { timezone: data.timezone } : {}),
        ...(data.journeyIntention !== undefined
          ? { journey_intention: data.journeyIntention?.trim() || null }
          : {}),
      } as any)
      .eq("id", userId)
      .select("id, current_couple_id, onboarded_at")
      .maybeSingle();

    if (profileError) {
      console.error("[saveOnboarding] profile update failed", profileError);
      throw new Error(`Could not save your onboarding: ${profileError.message}`);
    }
    if (!updatedProfile?.onboarded_at) {
      throw new Error("Could not save your onboarding — profile not updated.");
    }

    const coupleId = updatedProfile.current_couple_id;

    if (coupleId) {
      if (data.goals.length) {
        const { error: goalsError } = await supabaseAdmin.from("couple_goals").upsert(
          data.goals.map(g => ({ couple_id: coupleId, goal: g })),
          { onConflict: "couple_id,goal" }
        );
        if (goalsError) {
          console.error("[saveOnboarding] couple_goals upsert failed", goalsError);
          throw new Error(`Could not save your goals: ${goalsError.message}`);
        }
      }
      if (data.firstLetter && data.firstLetter.trim()) {
        const { data: existing } = await supabaseAdmin
          .from("letters").select("id")
          .eq("couple_id", coupleId)
          .eq("author_id", userId)
          .eq("is_first_letter", true).maybeSingle();
        if (!existing) {
          const { data: ins } = await supabaseAdmin.from("letters").insert({
            couple_id: coupleId,
            author_id: userId,
            body: data.firstLetter.trim(),
            is_first_letter: true,
          }).select("id").maybeSingle();
          await supabaseAdmin.from("xp_events").upsert({
            user_id: userId,
            couple_id: coupleId,
            kind: "letter", amount: XP_FOR.letter,
            ref_id: ins?.id ?? null,
            dedupe_key: `first_letter:${coupleId}`,
          }, { onConflict: "user_id,kind,dedupe_key", ignoreDuplicates: true });
        }
      }
    }

    return { ok: true };
  });


export const saveFirstLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    coupleId: z.string().uuid(),
    body: z.string().min(1).max(500),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabase
      .from("letters").select("id")
      .eq("couple_id", data.coupleId)
      .eq("author_id", userId)
      .eq("is_first_letter", true).maybeSingle();
    if (existing) {
      await supabase.from("letters").update({ body: data.body.trim() }).eq("id", existing.id);
    } else {
      const { data: ins } = await supabase.from("letters").insert({
        couple_id: data.coupleId, author_id: userId,
        body: data.body.trim(), is_first_letter: true,
      }).select("id").maybeSingle();
      await supabaseAdmin.from("xp_events").upsert({
        user_id: userId, couple_id: data.coupleId,
        kind: "letter", amount: XP_FOR.letter,
        ref_id: ins?.id ?? null,
        dedupe_key: `first_letter:${data.coupleId}`,
      }, { onConflict: "user_id,kind,dedupe_key", ignoreDuplicates: true });
    }
    return { ok: true };
  });

export const updateCoupleGoals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    goals: z.array(z.string().min(1).max(80)).max(8),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles").select("current_couple_id").eq("id", userId).maybeSingle();
    if (!profile?.current_couple_id) throw new Error("Not in a couple.");
    const coupleId = profile.current_couple_id;
    await supabase.from("couple_goals").delete().eq("couple_id", coupleId);
    if (data.goals.length) {
      await supabase.from("couple_goals").insert(
        data.goals.map(g => ({ couple_id: coupleId, goal: g })),
      );
    }
    return { ok: true };
  });

export const saveLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    body: z.string().min(1).max(2000),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabase
      .from("profiles").select("current_couple_id").eq("id", userId).maybeSingle();
    if (!profile?.current_couple_id) throw new Error("You're not in a couple yet.");
    const coupleId = profile.current_couple_id;
    const { data: ins } = await supabase.from("letters").insert({
      couple_id: coupleId, author_id: userId,
      body: data.body.trim(), is_first_letter: false,
    }).select("id").maybeSingle();
    await supabaseAdmin.from("xp_events").upsert({
      user_id: userId, couple_id: coupleId,
      kind: "letter", amount: XP_FOR.letter,
      ref_id: ins?.id ?? null,
      dedupe_key: `letter:${ins?.id ?? crypto.randomUUID()}`,
    }, { onConflict: "user_id,kind,dedupe_key", ignoreDuplicates: true });
    return { ok: true };
  });
