import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEvent = "app_opened" | "session_started" | "activity_started" | "first_activity_started" | "premium_viewed" | "purchase_started";
type Attribution = { source?: string; medium?: string; campaign?: string; content?: string; term?: string };
const SESSION_KEY = "oj.analytics.session";
const ATTRIBUTION_KEY = "oj.analytics.attribution";
const SESSION_WINDOW_MS = 30 * 60 * 1000;

function readAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try { const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY); return raw ? (JSON.parse(raw) as Attribution) : null; } catch { return null; }
}

function captureAttribution() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const attribution = { source: params.get("utm_source") ?? undefined, medium: params.get("utm_medium") ?? undefined, campaign: params.get("utm_campaign") ?? undefined, content: params.get("utm_content") ?? undefined, term: params.get("utm_term") ?? undefined };
  if (!Object.values(attribution).some(Boolean)) return readAttribution();
  try { window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution)); } catch { /* ignore */ }
  return attribution;
}

export async function trackClientEvent(event: AnalyticsEvent, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase.from("profiles").select("current_couple_id").eq("id", user.id).maybeSingle();
  let sessionId: string | undefined;
  try { sessionId = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? "null")?.id as string | undefined; } catch { /* ignore */ }
  const attribution = readAttribution();
  const { error } = await supabase.from("app_events").insert({ user_id: user.id, couple_id: profile?.current_couple_id ?? null, event, props: { ...props, ...(sessionId ? { session_id: sessionId } : {}), ...(attribution ? { attribution } : {}) } });
  if (error) console.warn("[analytics] event failed", event, error.message);
}

export async function initializeAnalytics() {
  if (typeof window === "undefined") return;
  captureAttribution();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const now = Date.now();
  let sessionId: string;
  let shouldStartSession = true;
  try {
    const existing = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? "null") as { id?: string; lastSeen?: number } | null;
    if (existing?.id && existing.lastSeen && now - existing.lastSeen < SESSION_WINDOW_MS) { sessionId = existing.id; shouldStartSession = false; } else sessionId = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: sessionId, lastSeen: now }));
  } catch { sessionId = crypto.randomUUID(); }

  const attribution = readAttribution();
  if (attribution) await (supabase as any).rpc("capture_marketing_attribution", { _source: attribution.source ?? "direct", _medium: attribution.medium ?? null, _campaign: attribution.campaign ?? null, _content: attribution.content ?? null, _term: attribution.term ?? null });
  const { data: profile } = await supabase.from("profiles").select("current_couple_id").eq("id", user.id).maybeSingle();
  const props = { session_id: sessionId, path: window.location.pathname, referrer: document.referrer || null, ...(attribution ? { attribution } : {}) };
  await supabase.from("app_events").insert({ user_id: user.id, couple_id: profile?.current_couple_id ?? null, event: "app_opened", props });
  if (shouldStartSession) await supabase.from("app_events").insert({ user_id: user.id, couple_id: profile?.current_couple_id ?? null, event: "session_started", props });

  const activity = window.location.pathname.includes("/daily") ? "daily_prompt" : window.location.pathname.includes("/quests") ? "quest" : null;
  if (activity) {
    await supabase.from("app_events").insert({ user_id: user.id, couple_id: profile?.current_couple_id ?? null, event: "activity_started", props: { ...props, activity_type: activity } });
    await supabase.from("app_events").insert({ user_id: user.id, couple_id: profile?.current_couple_id ?? null, event: "first_activity_started", props: { ...props, activity_type: activity } });
  }
}
