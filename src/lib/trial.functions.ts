import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const TRIAL_DAYS = 7;
export const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

const PRODUCTS = ["the_atlas", "time_capsule"] as const;
type Product = (typeof PRODUCTS)[number];

const COL = {
  the_atlas: "atlas_trial_started_at",
  time_capsule: "timecapsule_trial_started_at",
} as const satisfies Record<Product, string>;

function hashEmail(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

export type TrialSnapshot = {
  startedAt: string | null;
  endsAt: string | null;
  active: boolean;
  daysLeft: number;
  used: boolean;
};

export function trialSnapshot(startedAtIso: string | null | undefined): TrialSnapshot {
  if (!startedAtIso) {
    return { startedAt: null, endsAt: null, active: false, daysLeft: 0, used: false };
  }
  const startedAt = new Date(startedAtIso).getTime();
  const endsAt = startedAt + TRIAL_MS;
  const now = Date.now();
  const active = now < endsAt;
  const daysLeft = active ? Math.max(1, Math.ceil((endsAt - now) / (24 * 60 * 60 * 1000))) : 0;
  return {
    startedAt: new Date(startedAt).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    active,
    daysLeft,
    used: true,
  };
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

/**
 * Start a 7-day trial for the given product on this account.
 * One-time per email, ever. Requires an active couple (feature can't be used without one).
 */
export const startFeatureTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ product: z.enum(PRODUCTS) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase, claims } = context;
    const email = (claims as { email?: string }).email;
    if (!email) throw new Error("No email on account — cannot start trial.");

    const col = COL[data.product];
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select(`current_couple_id, ${col}`)
      .eq("id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile?.current_couple_id) {
      throw new Error("Pair with your partner first — trials unlock a shared feature.");
    }
    if ((profile as Record<string, unknown>)[col]) {
      throw new Error("You've already used this trial.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const emailHash = hashEmail(email);

    const { data: prior } = await supabaseAdmin
      .from("feature_trial_usage")
      .select("email_hash")
      .eq("email_hash", emailHash)
      .eq("product", data.product)
      .maybeSingle();
    if (prior) {
      throw new Error("This email has already used a trial for this feature.");
    }

    const startedAt = new Date();
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ [col]: startedAt.toISOString() })
      .eq("id", userId);
    if (upErr) throw new Error(upErr.message);

    const { error: insErr } = await supabaseAdmin
      .from("feature_trial_usage")
      .insert({ email_hash: emailHash, product: data.product });
    if (insErr && !insErr.message.toLowerCase().includes("duplicate")) {
      throw new Error(insErr.message);
    }

    return {
      product: data.product,
      startedAt: startedAt.toISOString(),
      endsAt: new Date(startedAt.getTime() + TRIAL_MS).toISOString(),
      daysLeft: TRIAL_DAYS,
    };
  });

/**
 * Admin/dev: reset the permanent email-usage record for a given email + product
 * AND null out the trial timestamp on any matching profile. For testing only.
 */
export const adminResetFeatureTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      email: z.string().email(),
      product: z.enum(PRODUCTS),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const emailHash = hashEmail(data.email);

    await supabaseAdmin
      .from("feature_trial_usage")
      .delete()
      .eq("email_hash", emailHash)
      .eq("product", data.product);

    // Find any user with this email (case-insensitive) and null their timestamp.
    const ids: string[] = [];
    let page = 1;
    while (page <= 20) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw new Error(error.message);
      for (const u of list.users) {
        if ((u.email ?? "").toLowerCase() === data.email.toLowerCase()) ids.push(u.id);
      }
      if (list.users.length < 200) break;
      page += 1;
    }
    if (ids.length) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ [COL[data.product]]: null })
        .in("id", ids);
      if (error) throw new Error(error.message);
    }
    return { ok: true, resetUsers: ids.length };
  });

/**
 * Admin/dev: force a trial start timestamp on a specific user, in the past,
 * to quickly test "3 days left", "last day", or "expired" states.
 */
export const adminSetTrialStartedAt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      product: z.enum(PRODUCTS),
      days_ago: z.number().min(0).max(60),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ts = new Date(Date.now() - data.days_ago * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ [COL[data.product]]: ts })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true, startedAt: ts, daysAgo: data.days_ago };
  });
