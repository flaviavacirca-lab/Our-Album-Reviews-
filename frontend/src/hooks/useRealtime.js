import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase.js";

export function useRealtime(table, filter, onChange) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!filter) return;

    const channel = supabase
      .channel(`${table}-${filter}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        (payload) => onChange(payload)
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, onChange]);

  return channelRef;
}
