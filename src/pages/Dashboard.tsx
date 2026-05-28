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
        .select("id, title, department_id, department_name, status, owner_name, owner_id, tags, content, qualityScore:quality_score,
