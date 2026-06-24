// Server-only streak helpers. Imported lazily by .functions.ts handlers.
import type { SupabaseClient } from "@supabase/supabase-js";
import { localToday, daysBetween } from "@/lib/xp";

type AdminClient = SupabaseClient;

/**
 * Advance a user's personal streak to "today" in the user's local timezone.
 * Idempotent: a second call on the same day is a no-op. Uses a freeze when
 * exactly one day was missed and a freeze is available; otherwise the streak
 * resets to 1. Always keeps longest_streak monotonic.
 */
export async function advanceUserStreak(
  supabaseAdmin: AdminClient,
  userId: string,
  userTz: string,
): Promise<void> {
  const today = localToday(userTz);
  const { data: s } = await supabaseAdmin
    .from("user_streaks").select("*").eq("user_id", userId).maybeSingle();

  if (!s) {
    await supabaseAdmin.from("user_streaks").insert({
      user_id: userId, current_streak: 1, longest_streak: 1, last_active_date: today,
    });
    return;
  }
  if (s.last_active_date === today) return;

  const diff = s.last_active_date ? daysBetween(s.last_active_date, today) : null;
  let freezes = s.freezes_available ?? 0;
  let newStreak = 1;
  if (diff === 1) newStreak = (s.current_streak ?? 0) + 1;
  else if (diff === 2 && freezes > 0) {
    newStreak = (s.current_streak ?? 0) + 1;
    freezes -= 1;
  }

  await supabaseAdmin.from("user_streaks").update({
    current_streak: newStreak,
    longest_streak: Math.max(s.longest_streak ?? 0, newStreak),
    last_active_date: today,
    freezes_available: freezes,
  }).eq("user_id", userId);
}

/**
 * Advance the couple streak when both members are active today. Uses one
 * SQL aggregate (couple_both_active_on) instead of N×2 round-trips.
 */
export async function maybeAdvanceCoupleStreak(
  supabaseAdmin: AdminClient,
  coupleId: string,
  promptDate: string,
): Promise<void> {
  const { data: bothActive } = await supabaseAdmin
    .rpc("couple_both_active_on", { _couple_id: coupleId, _date: promptDate });
  if (!bothActive) return;

  const { data: cs } = await supabaseAdmin
    .from("couple_streaks").select("*").eq("couple_id", coupleId).maybeSingle();
  if (!cs) {
    await supabaseAdmin.from("couple_streaks").insert({
      couple_id: coupleId, current_streak: 1, longest_streak: 1, last_both_active_date: promptDate,
    });
    return;
  }
  if (cs.last_both_active_date === promptDate) return;
  const diff = cs.last_both_active_date ? daysBetween(cs.last_both_active_date, promptDate) : null;
  const newStreak = diff === 1 ? (cs.current_streak ?? 0) + 1 : 1;
  await supabaseAdmin.from("couple_streaks").update({
    current_streak: newStreak,
    longest_streak: Math.max(cs.longest_streak ?? 0, newStreak),
    last_both_active_date: promptDate,
  }).eq("couple_id", coupleId);
}
