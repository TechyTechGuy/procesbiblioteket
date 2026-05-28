import { useState, useEffect, useCallback } from "react";
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
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [favIds, setFavIds] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("custom");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [detailProcess, setDetailProcess] = useState<Process | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("processes")
        .select(
          "id, title, department_id, status, owner_name, owner_id, tags, content, quality_score, updated_at, departments(name)"
        )
        .is("deleted_at", null);

      const mapped: Process[] = (data ?? []).map((r: any) => ({
        id: r.id,
        title: r.title,
        department_id: r.department_id,
        department_name: r.departments?.name ?? "",
        status: r.status,
        owner_name: r.owner_name,
        owner_id: r.owner_id,
        tags: r.tags ?? [],
        content: r.content ?? "",
        qualityScore: r.quality_score ?? 0,
        updatedAt: r.updated_at,
      }));
      setAllProcesses(mapped);

      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        if (Array.isArray(saved.pinnedIds)) setPinnedIds(saved.pinnedIds);
        if (Array.isArray(saved.order)) setOrder(saved.order);
        if (saved.view) setView(saved.view);
        const favs = JSON.parse(localStorage.getItem(FAVS_KEY) || "[]");
        if (Array.isArray(favs)) setFavIds(favs);
      } catch {
        /* ignore */
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pinnedIds, order, view }));
  }, [pinnedIds, order, view]);

  useEffect(() => {
    localStorage.setItem(FAVS_KEY, JSON.stringify(favIds));
  }, [favIds]);

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

  const reorder = useCallback((fromId: string, toId: string) => {
    setOrder((prev) => {
      const base = prev.length ? [...prev] : pinnedIds.slice();
      const from = base.indexOf(fromId);
      const to = base.indexOf(toId);
      if (from === -1 || to === -1) return prev;
      base.splice(to, 0, base.splice(from, 1)[0]);
      return base;
    });
  }, [pinnedIds]);

  const departments = Array.from(
    new Set(allProcesses.map((p) => p.department_name).filter(Boolean))
  );

  const visible = allProcesses
    .filter((p) => pinnedIds.includes(p.id))
    .filter((p) => {
      const s = search.toLowerCase();
      if (s && !(p.title.toLowerCase().includes(s) || p.department_name?.toLowerCase().includes(s))) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterDept !== "all" && p.department_name !== filterDept) return false;
      return true;
    });

  const sorted = [...visible].sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "score":
        return (b.qualityScore ?? 0) - (a.qualityScore ?? 0);
      case "updated":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "favs": {
        const af = favIds.includes(a.id) ? 0 : 1;
        const bf = favIds.includes(b.id) ? 0 : 1;
        return af - bf;
      }
      default: {
        const ai = order.indexOf(a.id);
        const bi = order.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
    }
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
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
