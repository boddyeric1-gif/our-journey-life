import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Status = "active-now" | "active-today" | null;

const FIVE_MIN = 5 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;
const HEARTBEAT_INTERVAL = 60 * 1000;

function deriveStatus(iso: string | null): { status: Status; label: string | null } {
  if (!iso) return { status: null, label: null };
  const delta = Date.now() - new Date(iso).getTime();
  if (delta < 0 || Number.isNaN(delta)) return { status: null, label: null };
  if (delta <= FIVE_MIN) return { status: "active-now", label: "Active now" };
  if (delta <= ONE_DAY) return { status: "active-today", label: "Active today" };
  return { status: null, label: null };
}

export function usePartnerPresence({
  userId,
  partnerId,
  initialPartnerLastActiveAt = null,
}: {
  userId: string | null;
  partnerId: string | null;
  initialPartnerLastActiveAt?: string | null;
}) {
  const [partnerLastActiveAt, setPartnerLastActiveAt] = useState<string | null>(
    initialPartnerLastActiveAt
  );
  const [tick, setTick] = useState(0);
  const lastHeartbeatRef = useRef(0);

  // Seed updates when SSR/query data refreshes with a fresher value.
  useEffect(() => {
    if (initialPartnerLastActiveAt) setPartnerLastActiveAt(initialPartnerLastActiveAt);
  }, [initialPartnerLastActiveAt]);

  // ---- Heartbeat: write our own last_active_at, best-effort ----
  useEffect(() => {
    if (!userId) return;

    const heartbeat = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastHeartbeatRef.current < HEARTBEAT_INTERVAL) return;
      lastHeartbeatRef.current = now;
      try {
        await supabase
          .from("profiles")
          .update({ last_active_at: new Date(now).toISOString() })
          .eq("id", userId);
      } catch {
        /* presence is best-effort */
      }
    };

    void heartbeat(true);
    const interval = window.setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) void heartbeat();
    }, HEARTBEAT_INTERVAL);

    const onVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) void heartbeat(true);
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    // Native foreground re-heartbeat via Capacitor. Dynamic-import so the web
    // bundle and SSR don't crash when the native plugin is unavailable.
    let removeNativeListener: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        if (cancelled) return;
        const handle = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) void heartbeat(true);
        });
        removeNativeListener = () => {
          void handle.remove();
        };
      } catch {
        /* not running in a Capacitor shell — fine */
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      if (removeNativeListener) removeNativeListener();
    };
  }, [userId]);

  // ---- Realtime: watch partner's profile row for last_active_at updates ----
  useEffect(() => {
    if (!partnerId) return;
    const channel = supabase
      .channel(`partner-presence:${partnerId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${partnerId}`,
        },
        (payload) => {
          const next =
            (payload.new as { last_active_at?: string | null } | null)?.last_active_at ?? null;
          if (next) setPartnerLastActiveAt(next);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [partnerId]);

  // ---- Tick every minute so the bucket transitions without a new event ----
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  // `tick` is intentionally read so the derivation re-runs each minute.
  void tick;
  const { status, label } = deriveStatus(partnerLastActiveAt);
  return { partnerLastActiveAt, status, statusLabel: label };
}
