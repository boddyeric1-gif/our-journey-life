import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "time-capsules";

async function getCoupleAndEntitlement(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("profiles").select("current_couple_id").eq("id", userId).maybeSingle();
  const coupleId = profile?.current_couple_id as string | null | undefined;
  if (!coupleId) throw new Error("Pair with your partner first.");
  const { data: ent } = await supabase.rpc("couple_has_entitlement", {
    _couple_id: coupleId, _product: "time_capsule",
  });
  if (!ent) throw new Error("The Time Capsule isn't unlocked for your couple yet.");
  return coupleId;
}

// List capsules: returns sealed (metadata only) + opened (with body).
// RLS already hides partner-authored sealed rows; we still strip body to be safe.
export const listTimeCapsules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const coupleId = await getCoupleAndEntitlement(supabase, userId);

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("time_capsules")
      .select("id, author_id, kind, title, body, audio_duration_sec, unlock_at, unlocked_at, recipient, created_at")
      .eq("couple_id", coupleId)
      .order("unlock_at", { ascending: true });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{
      id: string; author_id: string; kind: 'letter' | 'voice'; title: string;
      body: string | null; audio_duration_sec: number | null;
      unlock_at: string; unlocked_at: string | null; recipient: string; created_at: string;
    }>;

    const sealed = rows
      .filter(r => r.unlock_at > nowIso)
      .map(r => ({
        id: r.id, kind: r.kind, title: r.title,
        unlock_at: r.unlock_at, recipient: r.recipient,
        author_id: r.author_id, mine: r.author_id === userId,
        audio_duration_sec: r.audio_duration_sec,
      }));

    const opened = rows
      .filter(r => r.unlock_at <= nowIso)
      .sort((a, b) => b.unlock_at.localeCompare(a.unlock_at))
      .map(r => ({
        id: r.id, kind: r.kind, title: r.title,
        unlock_at: r.unlock_at, unlocked_at: r.unlocked_at,
        author_id: r.author_id, mine: r.author_id === userId,
        recipient: r.recipient,
        audio_duration_sec: r.audio_duration_sec,
        body_preview: r.body ? r.body.slice(0, 140) : null,
      }));

    return { coupleId, sealed, opened };
  });

export const getTimeCapsule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await getCoupleAndEntitlement(supabase, userId);

    const { data: row, error } = await supabase
      .from("time_capsules").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found.");

    const isAuthor = row.author_id === userId;
    const unlocked = new Date(row.unlock_at as string) <= new Date();

    if (!isAuthor && !unlocked) throw new Error("Not unlocked yet.");

    let audioUrl: string | null = null;
    if (row.kind === "voice" && row.audio_path && (isAuthor || unlocked)) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET).createSignedUrl(row.audio_path as string, 60 * 10);
      audioUrl = signed?.signedUrl ?? null;
    }

    // Set unlocked_at on first partner view after unlock.
    if (!isAuthor && unlocked && !row.unlocked_at) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("time_capsules")
        .update({ unlocked_at: new Date().toISOString() }).eq("id", row.id);
    }

    return {
      id: row.id as string,
      author_id: row.author_id as string,
      mine: isAuthor,
      kind: row.kind as 'letter' | 'voice',
      title: row.title as string,
      body: (isAuthor || unlocked) ? (row.body as string | null) : null,
      audio_duration_sec: row.audio_duration_sec as number | null,
      audioUrl,
      unlock_at: row.unlock_at as string,
      unlocked,
      unlocked_at: row.unlocked_at as string | null,
      recipient: row.recipient as string,
      created_at: row.created_at as string,
    };
  });

export const createTimeCapsule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    kind: z.enum(['letter', 'voice']),
    title: z.string().min(1).max(120),
    body: z.string().max(20000).optional(),
    audio_base64: z.string().max(5_500_000).optional(), // ~4 MB raw
    audio_mime: z.enum(['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg']).optional(),
    audio_duration_sec: z.number().int().min(1).max(180).optional(),
    unlock_at: z.string().datetime(),
    recipient: z.enum(['partner', 'both', 'self']).default('partner'),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const coupleId = await getCoupleAndEntitlement(supabase, userId);

    const unlock = new Date(data.unlock_at);
    const now = Date.now();
    if (unlock.getTime() < now + 24 * 3600 * 1000) {
      throw new Error("Pick an unlock date at least one day from now.");
    }
    if (unlock.getTime() > now + 10 * 365 * 24 * 3600 * 1000) {
      throw new Error("Unlock date can be at most 10 years from now.");
    }

    if (data.kind === 'letter' && !data.body?.trim()) {
      throw new Error("A letter needs a body.");
    }
    if (data.kind === 'voice' && (!data.audio_base64 || !data.audio_mime || !data.audio_duration_sec)) {
      throw new Error("Voice capsules need an audio recording.");
    }

    // Insert row first (RLS enforces couple membership + author = me).
    const { data: row, error: insErr } = await supabase
      .from("time_capsules")
      .insert({
        couple_id: coupleId,
        author_id: userId,
        kind: data.kind,
        title: data.title.trim(),
        body: data.kind === 'letter' ? data.body!.trim() : null,
        audio_duration_sec: data.audio_duration_sec ?? null,
        unlock_at: unlock.toISOString(),
        recipient: data.recipient,
      })
      .select("id")
      .single();
    if (insErr || !row) throw new Error(insErr?.message ?? "Could not seal capsule.");

    if (data.kind === 'voice' && data.audio_base64 && data.audio_mime) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const ext = data.audio_mime === 'audio/webm' ? 'webm'
        : data.audio_mime === 'audio/mp4' ? 'm4a'
        : data.audio_mime === 'audio/mpeg' ? 'mp3' : 'ogg';
      const path = `${coupleId}/${row.id}.${ext}`;
      const bin = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0));
      const { error: upErr } = await supabaseAdmin.storage.from(BUCKET)
        .upload(path, bin, { contentType: data.audio_mime, upsert: true });
      if (upErr) {
        await supabaseAdmin.from("time_capsules").delete().eq("id", row.id);
        throw new Error(`Audio upload failed: ${upErr.message}`);
      }
      await supabaseAdmin.from("time_capsules")
        .update({ audio_path: path }).eq("id", row.id);
    }

    return { id: row.id as string };
  });

export const deleteTimeCapsule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await getCoupleAndEntitlement(supabase, userId);

    const { data: row } = await supabase
      .from("time_capsules").select("id, author_id, unlock_at, audio_path")
      .eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Not found.");
    if (row.author_id !== userId) throw new Error("Only the author can delete.");
    if (new Date(row.unlock_at as string) <= new Date()) {
      throw new Error("This capsule has already been opened.");
    }

    const { error } = await supabase.from("time_capsules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    if (row.audio_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from(BUCKET).remove([row.audio_path as string]);
    }
    return { ok: true };
  });
