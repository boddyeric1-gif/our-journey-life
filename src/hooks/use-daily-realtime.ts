import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to a couple's daily_responses table so the dual-reveal updates the
 * moment the partner seals their answer. Replaces the manual refresh button.
 *
 * Safe to call on unpaired users (coupleId null) — the hook becomes a no-op.
 */
export function useDailyRealtime(coupleId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`daily:${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "daily_responses",
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["home"] });
          queryClient.invalidateQueries({ queryKey: ["daily"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, queryClient]);
}
