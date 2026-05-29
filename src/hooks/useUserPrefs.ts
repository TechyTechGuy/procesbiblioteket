import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const LEGACY_FAVS_KEY = "library_favs";

export function useUserPrefs() {
  const { user } = useAuth();
  const [favIds, setFavIds] = useState<string[]>([]);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const orderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("dashboard_preferences")
        .select("fav_ids, order_ids")
        .eq("user_id", user.id)
        .maybeSingle();

      let favs = (data?.fav_ids as string[] | undefined) ?? [];
      const order = (data?.order_ids as string[] | undefined) ?? [];

      // One-shot migration from localStorage
      try {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_FAVS_KEY) ?? "[]");
        if (Array.isArray(legacy) && legacy.length && favs.length === 0) {
          favs = legacy;
          await supabase.from("dashboard_preferences").upsert(
            { user_id: user.id, fav_ids: favs, order_ids: order },
            { onConflict: "user_id" }
          );
        }
        localStorage.removeItem(LEGACY_FAVS_KEY);
      } catch { /* ignore */ }

      if (cancelled) return;
      setFavIds(favs);
      setOrderIds(order);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const toggleFav = useCallback(async (id: string) => {
    if (!user) return;
    const next = favIds.includes(id) ? favIds.filter(x => x !== id) : [...favIds, id];
    setFavIds(next);
    await supabase.from("dashboard_preferences").upsert(
      { user_id: user.id, fav_ids: next, order_ids: orderIds },
      { onConflict: "user_id" }
    );
  }, [favIds, orderIds, user]);

  const setOrder = useCallback((ids: string[]) => {
    setOrderIds(ids);
    if (!user) return;
    if (orderTimer.current) clearTimeout(orderTimer.current);
    orderTimer.current = setTimeout(() => {
      supabase.from("dashboard_preferences").upsert(
        { user_id: user.id, fav_ids: favIds, order_ids: ids },
        { onConflict: "user_id" }
      );
    }, 300);
  }, [favIds, user]);

  return { favIds, orderIds, toggleFav, setOrder, loaded };
}
