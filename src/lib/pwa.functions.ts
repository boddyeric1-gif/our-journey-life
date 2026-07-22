import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OutcomeSchema = z.object({
  outcome: z.enum(["shown", "accepted", "dismissed", "installed", "ios_shown", "ios_dismissed"]),
  platform: z.string().max(64).optional(),
  userAgent: z.string().max(512).optional(),
});

export const logPwaInstallEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => OutcomeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("pwa_install_events").insert({
      user_id: userId,
      outcome: data.outcome,
      platform: data.platform ?? null,
      user_agent: data.userAgent ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
