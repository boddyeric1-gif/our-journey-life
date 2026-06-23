import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to a couple's quest_step_completions so the partner-confirm signal
 * for "Together" steps shows up without a refresh.
 */
export function useQuestRealtime(coupleId: string | null | undefined, chapterSlug?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`quest-completions:${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quest_step_completions",
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          if (chapterSlug) {
            queryClient.invalidateQueries({ queryKey: ["chapter", chapterSlug] });
          }
          queryClient.invalidateQueries({ queryKey: ["home-state"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, chapterSlug, queryClient]);
}
