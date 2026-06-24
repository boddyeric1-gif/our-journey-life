import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { XP_FOR, generateInviteCode } from "@/lib/xp";

// Create a new couple and an invite code. Idempotent: if the caller already
// has a current couple, returns that couple + its newest unused invite.
export const createCouple = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles").select("current_couple_id").eq("id", userId).maybeSingle();
    if (existingProfile?.current_couple_id) {
      const coupleId = existingProfile.current_couple_id;
      const { data: invite } = await supabaseAdmin
        .from("invites").select("code")
        .eq("couple_id", coupleId).is("used_by", null)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      let code = invite?.code as string | undefined;
      if (!code) {
        code = generateInviteCode();
        for (let i = 0; i < 5; i++) {
          const { error } = await supabaseAdmin.from("invites").insert({
            code, couple_id: coupleId, created_by: userId,
          });
          if (!error) break;
          code = generateInviteCode();
        }
      }
      return { coupleId, inviteCode: code };
    }

    const { data: couple, error: ce } = await supabaseAdmin
      .from("couples").insert({ status: "pending" }).select().single();
    if (ce || !couple) throw new Error(ce?.message || "Could not create couple");

    const { error: me } = await supabaseAdmin
      .from("couple_members").insert({ couple_id: couple.id, user_id: userId });
    if (me) throw new Error(me.message);

    await supabaseAdmin.from("profiles").update({ current_couple_id: couple.id }).eq("id", userId);
    await supabaseAdmin.from("couple_streaks").upsert({ couple_id: couple.id }, { onConflict: "couple_id" });

    let code = generateInviteCode();
    for (let i = 0; i < 5; i++) {
      const { error } = await supabaseAdmin.from("invites").insert({
        code, couple_id: couple.id, created_by: userId,
      });
      if (!error) break;
      code = generateInviteCode();
    }

    return { coupleId: couple.id, inviteCode: code };
  });

export const lookupInvite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(4).max(12) }).parse(d))
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.toUpperCase();

    const { data: invite, error } = await supabaseAdmin
      .from("invites").select("*").eq("code", code).maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite) return { ok: false as const, reason: "not_found" as const };
    if (invite.used_by && invite.used_by !== userId) return { ok: false as const, reason: "used" as const };
    if (new Date(invite.expires_at) < new Date()) return { ok: false as const, reason: "expired" as const };

    const { data: members } = await supabaseAdmin
      .from("couple_members").select("user_id").eq("couple_id", invite.couple_id);
    const inviterId = members?.find(m => m.user_id !== userId)?.user_id ?? invite.created_by;
    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles").select("display_name, anniversary, relationship_stage").eq("id", inviterId).maybeSingle();

    const { data: letter } = await supabaseAdmin
      .from("letters").select("body, created_at, author_id")
      .eq("couple_id", invite.couple_id).eq("is_first_letter", true)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    const { data: myProfile } = await supabaseAdmin
      .from("profiles").select("current_couple_id").eq("id", userId).maybeSingle();
    const alreadyPairedElsewhere = !!myProfile?.current_couple_id
      && myProfile.current_couple_id !== invite.couple_id;

    return {
      ok: true as const,
      coupleId: invite.couple_id,
      inviterName: inviterProfile?.display_name ?? "Your partner",
      inviterStage: inviterProfile?.relationship_stage ?? null,
      anniversary: inviterProfile?.anniversary ?? null,
      firstLetter: letter?.body ?? null,
      alreadyPairedElsewhere,
    };
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(4).max(12) }).parse(d))
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.toUpperCase();

    const { data: invite, error } = await supabaseAdmin
      .from("invites").select("*").eq("code", code).maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite) throw new Error("Invite not found");
    if (invite.used_by && invite.used_by !== userId) throw new Error("This invite is already used");
    if (new Date(invite.expires_at) < new Date()) throw new Error("This invite has expired");

    const { data: myProfile } = await supabaseAdmin
      .from("profiles").select("current_couple_id").eq("id", userId).maybeSingle();
    if (myProfile?.current_couple_id && myProfile.current_couple_id !== invite.couple_id) {
      throw new Error("You're already paired. Leave your current couple first to join another.");
    }

    const { data: existing } = await supabaseAdmin
      .from("couple_members").select("user_id")
      .eq("couple_id", invite.couple_id).eq("user_id", userId).maybeSingle();
    if (!existing) {
      const { error: me } = await supabaseAdmin
        .from("couple_members").insert({ couple_id: invite.couple_id, user_id: userId });
      if (me) throw new Error(me.message);
    }

    await supabaseAdmin.from("couples")
      .update({ status: "active", paired_at: new Date().toISOString() })
      .eq("id", invite.couple_id);

    await supabaseAdmin.from("invites")
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq("id", invite.id);

    await supabaseAdmin.from("profiles").update({ current_couple_id: invite.couple_id }).eq("id", userId);

    const { data: members } = await supabaseAdmin
      .from("couple_members").select("user_id").eq("couple_id", invite.couple_id);
    for (const m of members ?? []) {
      await supabaseAdmin.from("xp_events").upsert({
        user_id: m.user_id, couple_id: invite.couple_id,
        kind: "first_pair", amount: XP_FOR.first_pair,
        dedupe_key: `first_pair:${invite.couple_id}`,
      }, { onConflict: "user_id,kind,dedupe_key", ignoreDuplicates: true });
    }

    return { coupleId: invite.couple_id };
  });

export const leaveCouple = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles").select("current_couple_id").eq("id", userId).maybeSingle();
    if (!profile?.current_couple_id) return { ok: true };
    await supabase.from("couple_members")
      .delete().eq("couple_id", profile.current_couple_id).eq("user_id", userId);
    await supabase.from("profiles").update({ current_couple_id: null }).eq("id", userId);
    return { ok: true };
  });

// Mark partner letters as seen by the current user. Letters trigger only
// allows non-author updates to seen_at (see letters_partner_only_seen_at).
export const markLettersSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    letterIds: z.array(z.string().uuid()).max(50),
  }).parse(d))
  .handler(async ({ context, data }) => {
    if (data.letterIds.length === 0) return { ok: true, updated: 0 };
    const { supabase, userId } = context;
    const nowIso = new Date().toISOString();
    // RLS + DB trigger enforce: only partner letters get a seen_at write.
    const { error, count } = await supabase
      .from("letters")
      .update({ seen_at: nowIso }, { count: "exact" })
      .in("id", data.letterIds)
      .neq("author_id", userId)
      .is("seen_at", null);
    if (error) throw new Error(error.message);
    return { ok: true, updated: count ?? 0 };
  });
