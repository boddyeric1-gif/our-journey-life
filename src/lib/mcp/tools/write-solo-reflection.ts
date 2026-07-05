import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function localToday(tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
    return fmt.format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export default defineTool({
  name: "write_solo_reflection",
  title: "Write today's solo reflection",
  description:
    "Create or update the signed-in user's private solo reflection for today (dated in their timezone). Solo reflections are never shared with the partner.",
  inputSchema: {
    body: z.string().trim().min(1).max(2000).describe("The reflection text (max 2000 chars)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ body }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: profile } = await supabase
      .from("profiles").select("timezone").eq("id", userId).maybeSingle();
    const tz = (profile as { timezone?: string | null } | null)?.timezone ?? "UTC";
    const promptDate = localToday(tz);

    const { data: existing } = await supabase
      .from("solo_reflections").select("id")
      .eq("user_id", userId).eq("prompt_date", promptDate).maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("solo_reflections").update({ body }).eq("id", existing.id);
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      return {
        content: [{ type: "text", text: `Updated today's reflection (${promptDate}).` }],
        structuredContent: { id: existing.id, prompt_date: promptDate, updated: true },
      };
    }

    const { data: row, error } = await supabase
      .from("solo_reflections")
      .insert({ user_id: userId, prompt_date: promptDate, body, parent_prompt_id: null })
      .select("id")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Saved today's reflection (${promptDate}).` }],
      structuredContent: { id: row?.id, prompt_date: promptDate, created: true },
    };
  },
});
