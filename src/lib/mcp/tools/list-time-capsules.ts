import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_time_capsules",
  title: "List time capsules",
  description:
    "List the couple's time capsules the signed-in user can see. Splits into sealed (unlocks in the future, metadata only) and opened (already unlocked, with a short body preview).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: profile } = await supabase
      .from("profiles").select("current_couple_id").eq("id", userId).maybeSingle();
    const coupleId = (profile as { current_couple_id?: string | null } | null)?.current_couple_id;
    if (!coupleId) {
      return { content: [{ type: "text", text: "You are not paired with a partner yet." }], isError: true };
    }

    const { data, error } = await supabase
      .from("time_capsules")
      .select("id, author_id, kind, title, body, unlock_at, unlocked_at, recipient, created_at")
      .eq("couple_id", coupleId)
      .order("unlock_at", { ascending: true });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const now = Date.now();
    const rows = (data ?? []) as Array<{
      id: string; author_id: string; kind: "letter" | "voice"; title: string;
      body: string | null; unlock_at: string; unlocked_at: string | null;
      recipient: string; created_at: string;
    }>;

    const sealed = rows.filter(r => new Date(r.unlock_at).getTime() > now).map(r => ({
      id: r.id, kind: r.kind, title: r.title, unlock_at: r.unlock_at,
      recipient: r.recipient, mine: r.author_id === userId,
    }));
    const opened = rows.filter(r => new Date(r.unlock_at).getTime() <= now).map(r => ({
      id: r.id, kind: r.kind, title: r.title, unlock_at: r.unlock_at,
      unlocked_at: r.unlocked_at, recipient: r.recipient,
      mine: r.author_id === userId,
      body_preview: r.body ? r.body.slice(0, 200) : null,
    }));

    const summary = { sealed_count: sealed.length, opened_count: opened.length, sealed, opened };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
