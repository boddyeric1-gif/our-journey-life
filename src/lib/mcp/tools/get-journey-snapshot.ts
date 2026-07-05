import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_journey_snapshot",
  title: "Get journey snapshot",
  description:
    "Return a compact summary of the signed-in user's Our Journey state: display name, partner (if paired), days together, current streak, and total XP.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("display_name, current_couple_id, timezone")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) {
      return { content: [{ type: "text", text: profErr.message }], isError: true };
    }

    const [{ data: streak }, { data: xpTotal }] = await Promise.all([
      supabase.from("user_streaks").select("current_streak, longest_streak, last_activity_date").eq("user_id", userId).maybeSingle(),
      supabase.rpc("user_total_xp", { _user_id: userId }),
    ]);

    let partnerName: string | null = null;
    let daysTogether: number | null = null;
    const coupleId = profile?.current_couple_id ?? null;
    if (coupleId) {
      const [{ data: couple }, { data: members }] = await Promise.all([
        supabase.from("couples").select("created_at, paired_at").eq("id", coupleId).maybeSingle(),
        supabase.from("couple_members").select("user_id").eq("couple_id", coupleId),
      ]);
      const partnerId = (members ?? []).find((m: { user_id: string }) => m.user_id !== userId)?.user_id;
      if (partnerId) {
        const { data: partner } = await supabase
          .from("profiles").select("display_name").eq("id", partnerId).maybeSingle();
        partnerName = (partner as { display_name?: string } | null)?.display_name ?? null;
      }
      const anchor = (couple?.paired_at ?? couple?.created_at) as string | undefined;
      if (anchor) {
        const start = new Date(anchor).getTime();
        daysTogether = Math.max(1, Math.floor((Date.now() - start) / 86_400_000) + 1);
      }
    }

    const snapshot = {
      display_name: profile?.display_name ?? null,
      paired: !!coupleId,
      partner_name: partnerName,
      days_together: daysTogether,
      current_streak: (streak as { current_streak?: number } | null)?.current_streak ?? 0,
      longest_streak: (streak as { longest_streak?: number } | null)?.longest_streak ?? 0,
      total_xp: Number(xpTotal ?? 0),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(snapshot, null, 2) }],
      structuredContent: snapshot,
    };
  },
});
