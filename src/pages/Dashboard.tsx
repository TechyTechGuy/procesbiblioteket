import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Process } from "@/lib/types";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardToolbar } from "@/components/dashboard/DashboardToolbar";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { AddProcessSheet } from "@/components/dashboard/AddProcessSheet";
import { ProcessDetailSheet } from "@/components/dashboard/ProcessDetailSheet";
import { AISearchDialog } from "@/components/dashboard/AISearchDialog";

export type ViewMode = "grid" | "list" | "group";
export type SortOption = "custom" | "title" | "score" | "updated" | "favs";

const STORAGE_KEY = "dashboard_layout";
const FAVS_KEY = "dashboard_favs";

export default function Dashboard() {
  const [allProcesses, setAllProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [favIds, setFavIds] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("custom");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [detailProcess, setDetailProcess] = useState<Process | null>(null);

  // Load persisted layout from database (with localStorage one-time migration)
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (!active) return;
      setUserId(uid);
      if (!uid) {
        setLoaded(true);
        return;
      }
      const { data } = await supabase
        .from("dashboard_preferences")
        .select("pinned_ids, order_ids, fav_ids")
        .eq("user_id", uid)
        .maybeSingle();
      if (!active) return;

      const hasRow =
        data &&
        ((data.pinned_ids?.length ?? 0) > 0 ||
          (data.order_ids?.length ?? 0) > 0 ||
          (data.fav_ids?.length ?? 0) > 0);

      if (hasRow) {
        setPinnedIds(data!.pinned_ids ?? []);
        setOrder(data!.order_ids ?? []);
        setFavIds(data!.fav_ids ?? []);
      } else {
        // One-time migration from localStorage
        let migratedPinned: string[] = [];
        let migratedOrder: string[] = [];
        let migratedFavs: string[] = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.pinnedIds)) migratedPinned = parsed.pinnedIds;
            if (Array.isArray(parsed.order)) migratedOrder = parsed.order;
          }
          const favs = localStorage.getItem(FAVS_KEY);
          if (favs) migratedFavs = JSON.parse(favs);
        } catch {
          // ignore
        }
        setPinnedIds(migratedPinned);
        setOrder(migratedOrder);
        setFavIds(migratedFavs);
        if (migratedPinned.length || migratedOrder.length || migratedFavs.length) {
          await supabase.from("dashboard_preferences").upsert(
            {
              user_id: uid,
              pinned_ids: migratedPinned,
              order_ids: migratedOrder,
              fav_ids: migratedFavs,
            },
            { onConflict: "user_id" }
          );
        }
      }
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Debounced persist to database
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded || !userId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase
        .from("dashboard_preferences")
        .upsert(
          {
            user_id: userId,
            pinned_ids: pinnedIds,
            order_ids: order,
            fav_ids: favIds,
          },
          { onConflict: "user_id" }
        )
        .then(() => {});
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [pinnedIds, order, favIds, loaded, userId]);

  // Fetch processes
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("processes")
        .select(
          "id, title, department_id, status, owner_name, owner_id, tags, content, quality_score, updated_at, departments(name)"
        )
        .is("deleted_at", null);
      if (!active) return;
      if (!error && data) {
        const mapped: Process[] = (data as any[]).map((r) => ({
          id: r.id,
          title: r.title,
          department_id: r.department_id,
          department_name: r.departments?.name ?? "",
          status: r.status,
          owner_name: r.owner_name ?? "",
          owner_id: r.owner_id,
          tags: r.tags ?? [],
          content: r.content ?? "",
          qualityScore: r.quality_score ?? 0,
          updatedAt: r.updated_at,
        }));
        setAllProcesses(mapped);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(allProcesses.map((p) => p.department_name).filter(Boolean))),
    [allProcesses]
  );

  const pinned = useMemo(
    () => pinnedIds.map((id) => allProcesses.find((p) => p.id === id)).filter(Boolean) as Process[],
    [pinnedIds, allProcesses]
  );

  const filtered = useMemo(() => {
    return pinned.filter((p) => {
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterDept !== "all" && p.department_name !== filterDept) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !p.title.toLowerCase().includes(s) &&
          !p.department_name.toLowerCase().includes(s) &&
          !(p.tags ?? []).some((t) => t.toLowerCase().includes(s))
        )
          return false;
      }
      return true;
    });
  }, [pinned, filterStatus, filterDept, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === "title") arr.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === "score") arr.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
    else if (sortBy === "updated")
      arr.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    else if (sortBy === "favs")
      arr.sort(
        (a, b) => (favIds.includes(b.id) ? 1 : 0) - (favIds.includes(a.id) ? 1 : 0)
      );
    else if (sortBy === "custom" && order.length) {
      arr.sort((a, b) => {
        const ia = order.indexOf(a.id);
        const ib = order.indexOf(b.id);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
    }
    return arr;
  }, [filtered, sortBy, order, favIds]);

  const toggleFav = useCallback((id: string) => {
    setFavIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const togglePin = useCallback((id: string, checked: boolean) => {
    setPinnedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  }, []);

  const removePinned = useCallback((id: string) => {
    setPinnedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const reorder = useCallback(
    (fromId: string, toId: string) => {
      const ids = sorted.map((p) => p.id);
      const from = ids.indexOf(fromId);
      const to = ids.indexOf(toId);
      if (from === -1 || to === -1) return;
      const next = [...ids];
      next.splice(to, 0, next.splice(from, 1)[0]);
      setOrder(next);
      setSortBy("custom");
    },
    [sorted]
  );

  return (
    <div className="space-y-4">
      <DashboardHeader view={view} onViewChange={setView} onAddClick={() => setAddOpen(true)} />
      <DashboardStats processes={sorted} />
      <DashboardToolbar
        search={search}
        onSearchChange={setSearch}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        filterDept={filterDept}
        onFilterDeptChange={setFilterDept}
        departments={departments}
        onAIClick={() => setAiOpen(true)}
      />
      <DashboardGrid
        processes={sorted}
        view={view}
        favIds={favIds}
        onToggleFav={toggleFav}
        onRemove={removePinned}
        onReorder={reorder}
        onOpen={setDetailProcess}
        loading={loading}
      />
      <AddProcessSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        allProcesses={allProcesses}
        pinnedIds={pinnedIds}
        onTogglePin={togglePin}
      />
      <ProcessDetailSheet
        process={detailProcess}
        isFav={detailProcess ? favIds.includes(detailProcess.id) : false}
        onToggleFav={() => detailProcess && toggleFav(detailProcess.id)}
        onClose={() => setDetailProcess(null)}
      />
      <AISearchDialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        allProcesses={allProcesses}
        onOpen={setDetailProcess}
      />
    </div>
  );
}
