import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { Search, Trash2, RotateCcw, X, Star, LayoutGrid, List as ListIcon, Upload, GripVertical, Globe, Share2, Mic } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { QualityMeter } from "@/components/QualityMeter";
import { supabase } from "@/integrations/supabase/client";
import { Status, STATUSES } from "@/lib/types";
import { toast } from "sonner";
import { LibraryStats } from "@/components/library/LibraryStats";
import { QuickUploadDialog } from "@/components/library/QuickUploadDialog";
import { VoiceProcessDialog, type VoiceProcessResult } from "@/components/library/VoiceProcessDialog";
import { useUserPrefs } from "@/hooks/useUserPrefs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, arrayMove,
  rectSortingStrategy, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Row {
  id: string;
  title: string;
  content: string;
  status: Status;
  owner_name: string;
  tags: string[];
  quality_score: number;
  department_id: string;
  deleted_at: string | null;
  visible_to_all: boolean;
  shared_department_ids: string[];
}

export default function Library() {
  const { departments, isAdmin, myDepartmentName, role, profile } = useAuth();
  const canManage = role === "admin" || role === "process_owner";
  const canEdit = role === "admin" || role === "process_owner" || role === "editor";
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [hardDeleteId, setHardDeleteId] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState<{ title?: string; departmentId?: string; content?: string } | null>(null);
  const { favIds, orderIds, toggleFav, setOrder } = useUserPrefs();

  const toggleFavClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    toggleFav(id);
  };

  const load = async () => {
    const { data } = await supabase
      .from("processes")
      .select("id, title, content, status, owner_name, tags, quality_score, department_id, deleted_at, visible_to_all, shared_department_ids")
      .order("updated_at", { ascending: false });
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtersActive = q !== "" || dept !== "all" || status !== "all" || showDeleted;

  const filtered = useMemo(() => {
    const list = rows
      .filter((p) => (showDeleted ? p.deleted_at !== null : p.deleted_at === null))
      .filter((p) => (dept === "all" ? true : p.department_id === dept))
      .filter((p) => (status === "all" ? true : p.status === status))
      .filter((p) => (q ? (p.title + p.tags.join(" ") + p.content).toLowerCase().includes(q.toLowerCase()) : true));

    // Apply user's saved order, with unknown ids appended (in updated_at order)
    const orderIndex = new Map(orderIds.map((id, i) => [id, i]));
    return [...list].sort((a, b) => {
      const ai = orderIndex.has(a.id) ? orderIndex.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const bi = orderIndex.has(b.id) ? orderIndex.get(b.id)! : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  }, [rows, q, dept, status, showDeleted, orderIds]);

  const activeRows = useMemo(() => rows.filter((r) => r.deleted_at === null), [rows]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = filtered.map((r) => r.id);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    const newOrder = arrayMove(ids, oldIdx, newIdx);

    // Merge: items not in current filtered list keep their relative position
    const filteredSet = new Set(ids);
    const remaining = orderIds.filter((id) => !filteredSet.has(id));
    setOrder([...newOrder, ...remaining]);
  };

  const softDelete = async (e: React.MouseEvent, p: Row) => {
    e.preventDefault(); e.stopPropagation();
    const { error } = await supabase.from("processes").update({ deleted_at: new Date().toISOString() }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Proces deaktiveret");
    load();
  };
  const restore = async (e: React.MouseEvent, p: Row) => {
    e.preventDefault(); e.stopPropagation();
    const { error } = await supabase.from("processes").update({ deleted_at: null }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Proces gendannet");
    load();
  };
  const hardDelete = async () => {
    if (!hardDeleteId) return;
    await supabase.from("process_versions").delete().eq("process_id", hardDeleteId);
    const { error } = await supabase.from("processes").delete().eq("id", hardDeleteId);
    setHardDeleteId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Proces slettet permanent");
    load();
  };

  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? "—";
  const deletedCount = rows.filter((r) => r.deleted_at !== null).length;
  const myDeptId = profile?.department_id ?? null;

  const sharingBadge = (p: Row) => {
    if (p.visible_to_all) return <Badge variant="secondary" className="gap-1"><Globe className="h-3 w-3" />Hele org.</Badge>;
    if (myDeptId && p.department_id !== myDeptId && p.shared_department_ids?.includes(myDeptId))
      return <Badge variant="secondary" className="gap-1"><Share2 className="h-3 w-3" />Delt</Badge>;
    return null;
  };

  const dragDisabled = filtersActive;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Procesbibliotek</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Du ser alle processer på tværs af afdelinger."
              : `Du ser processer i din afdeling (${myDepartmentName ?? "ingen tildelt"}) samt delte processer.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />Upload proces
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => setVoiceOpen(true)}>
              <Mic className="mr-2 h-4 w-4" />Indtal proces
            </Button>
          )}
          <div className="inline-flex rounded-md border bg-background">
            <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon"
              onClick={() => setView("grid")} aria-label="Grid">
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={view === "list" ? "secondary" : "ghost"} size="icon"
              onClick={() => setView("list")} aria-label="List">
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <LibraryStats rows={activeRows} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg i titel, tags eller indhold..." className="pl-8" />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle afdelinger</SelectItem>
            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statusser</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {canManage && (
          <Button variant={showDeleted ? "default" : "outline"} onClick={() => setShowDeleted((v) => !v)}>
            {showDeleted ? <X className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {showDeleted ? "Vis aktive" : `Papirkurv (${deletedCount})`}
          </Button>
        )}
      </div>

      {dragDisabled && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">Ryd filtre for at ændre rækkefølge med træk-og-slip.</p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={filtered.map((p) => p.id)}
          strategy={view === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
          disabled={dragDisabled}
        >
          {view === "grid" ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <SortableCard
                  key={p.id} p={p} disabled={dragDisabled}
                  favIds={favIds} toggleFavClick={toggleFavClick}
                  canManage={canManage} isAdmin={isAdmin}
                  deptName={deptName} sharingBadge={sharingBadge}
                  softDelete={softDelete} restore={restore}
                  setHardDeleteId={setHardDeleteId}
                />
              ))}
              {filtered.length === 0 && (
                <Card className="md:col-span-2 lg:col-span-3"><CardContent className="py-12 text-center text-sm text-muted-foreground">{showDeleted ? "Papirkurven er tom." : "Ingen processer matcher dine filtre."}</CardContent></Card>
              )}
            </div>
          ) : (
            <Card className="shadow-card">
              <CardContent className="p-0 divide-y">
                {filtered.map((p) => (
                  <SortableRow
                    key={p.id} p={p} disabled={dragDisabled}
                    favIds={favIds} toggleFavClick={toggleFavClick}
                    canManage={canManage}
                    deptName={deptName} sharingBadge={sharingBadge}
                    softDelete={softDelete} restore={restore}
                  />
                ))}
                {filtered.length === 0 && (
                  <p className="py-12 text-center text-sm text-muted-foreground">{showDeleted ? "Papirkurven er tom." : "Ingen processer matcher dine filtre."}</p>
                )}
              </CardContent>
            </Card>
          )}
        </SortableContext>
      </DndContext>

      <QuickUploadDialog
        open={uploadOpen}
        onOpenChange={(o) => { setUploadOpen(o); if (!o) setVoiceDraft(null); }}
        initial={voiceDraft}
      />
      <VoiceProcessDialog
        open={voiceOpen}
        onOpenChange={setVoiceOpen}
        onUseAsDraft={(r) => {
          const match = departments.find(
            (d) => d.name.trim().toLowerCase() === (r.afdeling ?? "").trim().toLowerCase(),
          );
          const parts: string[] = [];
          if (r.beskrivelse?.trim()) parts.push(r.beskrivelse.trim());
          if (r.ansvarlig?.trim()) parts.push(`**Ansvarlig:** ${r.ansvarlig.trim()}`);
          if (r.trin?.length) {
            parts.push("## Trin");
            parts.push(r.trin.map((t, i) => `${i + 1}. ${t}`).join("\n"));
          }
          setVoiceDraft({
            title: r.procesnavn || "",
            departmentId: match?.id,
            content: parts.join("\n\n"),
          });
          setVoiceOpen(false);
          setUploadOpen(true);
          if (r.afdeling && !match) {
            toast.info(`Afdeling "${r.afdeling}" matchede ingen — vælg manuelt.`);
          }
        }}
      />

      <AlertDialog open={!!hardDeleteId} onOpenChange={(o) => !o && setHardDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet proces permanent?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette sletter processen og alle versioner permanent. Handlingen kan ikke fortrydes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction onClick={hardDelete} className="bg-destructive text-destructive-foreground">Slet permanent</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CardItemProps {
  p: Row;
  disabled: boolean;
  favIds: string[];
  toggleFavClick: (e: React.MouseEvent, id: string) => void;
  canManage: boolean;
  isAdmin: boolean;
  deptName: (id: string) => string;
  sharingBadge: (p: Row) => React.ReactNode;
  softDelete: (e: React.MouseEvent, p: Row) => void;
  restore: (e: React.MouseEvent, p: Row) => void;
  setHardDeleteId: (id: string) => void;
}

function SortableCard({
  p, disabled, favIds, toggleFavClick, canManage, isAdmin,
  deptName, sharingBadge, softDelete, restore, setHardDeleteId,
}: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="h-full shadow-card hover:shadow-elegant transition-smooth hover:-translate-y-0.5 relative group">
        {!disabled && (
          <button
            {...attributes} {...listeners}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute top-2 left-2 z-10 p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted cursor-grab active:cursor-grabbing transition-smooth"
            aria-label="Træk for at flytte"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <Link to={`/process/${p.id}`} className="block">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight flex items-center gap-2">
                <button onClick={(e) => toggleFavClick(e, p.id)} className="text-muted-foreground hover:text-warning transition-smooth" aria-label="Favorit">
                  <Star className={`h-4 w-4 ${favIds.includes(p.id) ? "fill-warning text-warning" : ""}`} />
                </button>
                {p.title}
              </h3>
              <StatusBadge status={p.status} />
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{p.content}</p>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{deptName(p.department_id)}</span>
              <div className="flex items-center gap-2">
                {sharingBadge(p)}
                <span>{p.owner_name}</span>
              </div>
            </div>
            <QualityMeter score={p.quality_score} />
          </CardContent>
        </Link>
        {canManage && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            {p.deleted_at ? (
              <>
                <Button size="icon" variant="ghost" title="Gendan" onClick={(e) => restore(e, p)}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                {isAdmin && (
                  <Button size="icon" variant="ghost" title="Slet permanent"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setHardDeleteId(p.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </>
            ) : (
              <Button size="icon" variant="ghost" title="Deaktivér (soft delete)" onClick={(e) => softDelete(e, p)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

interface RowItemProps {
  p: Row;
  disabled: boolean;
  favIds: string[];
  toggleFavClick: (e: React.MouseEvent, id: string) => void;
  canManage: boolean;
  deptName: (id: string) => string;
  sharingBadge: (p: Row) => React.ReactNode;
  softDelete: (e: React.MouseEvent, p: Row) => void;
  restore: (e: React.MouseEvent, p: Row) => void;
}

function SortableRow({
  p, disabled, favIds, toggleFavClick, canManage, deptName, sharingBadge, softDelete, restore,
}: RowItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-smooth group">
      {!disabled && (
        <button {...attributes} {...listeners}
          className="text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
          aria-label="Træk for at flytte">
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <button onClick={(e) => toggleFavClick(e, p.id)} className="text-muted-foreground hover:text-warning" aria-label="Favorit">
        <Star className={`h-4 w-4 ${favIds.includes(p.id) ? "fill-warning text-warning" : ""}`} />
      </button>
      <Link to={`/process/${p.id}`} className="flex-1 min-w-0 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{p.title}</p>
          <p className="text-xs text-muted-foreground truncate">{deptName(p.department_id)} · {p.owner_name}</p>
        </div>
        <div className="hidden sm:block w-32"><QualityMeter score={p.quality_score} /></div>
        {sharingBadge(p)}
        <StatusBadge status={p.status} />
      </Link>
      {canManage && !p.deleted_at && (
        <Button size="icon" variant="ghost" title="Deaktivér" onClick={(e) => softDelete(e, p)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
      {canManage && p.deleted_at && (
        <Button size="icon" variant="ghost" title="Gendan" onClick={(e) => restore(e, p)}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
