import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "admin");
    if (rolesErr) throw new Error(rolesErr.message);

    const admins: Array<{ user_id: string; email: string | null }> = [];
    for (const r of roles ?? []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      admins.push({ user_id: r.user_id, email: u?.user?.email ?? null });
    }

    // Find caller's couple
    const { data: cm } = await context.supabase
      .from("couple_members")
      .select("couple_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    let myCouple: {
      couple_id: string;
      unlocks: Record<string, boolean>;
    } | null = null;

    if (cm?.couple_id) {
      const products = ["quests_advanced", "time_capsule", "the_atlas"];
      const unlocks: Record<string, boolean> = {};
      for (const p of products) {
        const { data: ok } = await context.supabase.rpc("couple_unlocked", {
          _couple_id: cm.couple_id,
          _product: p,
        });
        unlocks[p] = Boolean(ok);
      }
      myCouple = { couple_id: cm.couple_id, unlocks };
    }

    const { data: me } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    return {
      me: { user_id: context.userId, email: me?.user?.email ?? null },
      admins,
      myCouple,
    };
  });

export const grantAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string }) =>
    z.object({ email: z.string().email() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look up the user by email via Admin API (paginate, case-insensitive)
    let targetId: string | null = null;
    let page = 1;
    while (page <= 20 && !targetId) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw new Error(error.message);
      const match = list.users.find(
        (u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase(),
      );
      if (match) targetId = match.id;
      if (list.users.length < 200) break;
      page += 1;
    }
    if (!targetId) throw new Error("No user found with that email");

    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: targetId, role: "admin" });
    if (insErr && !insErr.message.includes("duplicate")) {
      throw new Error(insErr.message);
    }
    return { ok: true, user_id: targetId };
  });

export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { user_id: string }) =>
    z.object({ user_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: cErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) <= 1) throw new Error("Cannot revoke the last admin");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const inspectCouple = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { couple_id: string }) =>
    z.object({ couple_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: members } = await supabaseAdmin
      .from("couple_members")
      .select("user_id")
      .eq("couple_id", data.couple_id);

    const enriched: Array<{ user_id: string; email: string | null }> = [];
    for (const m of members ?? []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
      enriched.push({
        user_id: m.user_id,
        email: u?.user?.email ?? null,
      });
    }


    const products = ["quests_advanced", "time_capsule", "the_atlas"];
    const unlocks: Record<string, boolean> = {};
    for (const p of products) {
      // Use admin client so we don't get blocked by is_couple_member check
      const { data: ok } = await supabaseAdmin.rpc("couple_unlocked", {
        _couple_id: data.couple_id,
        _product: p,
      });
      unlocks[p] = Boolean(ok);
    }

    const { data: xp } = await supabaseAdmin.rpc("couple_total_xp", {
      _couple_id: data.couple_id,
    });
    const { data: shared } = await supabaseAdmin.rpc("couple_shared_days", {
      _couple_id: data.couple_id,
    });
    const { data: entitlements } = await supabaseAdmin
      .from("couple_entitlements")
      .select("product, status")
      .eq("couple_id", data.couple_id);

    return {
      couple_id: data.couple_id,
      members: enriched,
      xp: Number(xp ?? 0),
      shared_days: Number(shared ?? 0),
      unlocks,
      entitlements: entitlements ?? [],
    };
  });
