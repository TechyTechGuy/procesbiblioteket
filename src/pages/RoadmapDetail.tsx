import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, KeyboardSensor,
  PointerSensor, closestCorners, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ChevronLeft, ChevronRight, GripVertical, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RoadmapCardDialog, type CardDraft } from "@/components/roadmap/RoadmapCardDialog";
import { cn } from "@/lib/utils";

interface RoadmapColumn { id: string; label: string; order: number }
interface Roadmap {
  id: string; name: string; description: string | null;
  column_type: string; columns: RoadmapColumn[];
}
interface CardRow {
  id: string; roadmap_id: string; column_id: string; order: number;
  title: string; status: string | null; description: string | null; process_id: string | null;
}

const STATUS_DOT: Record<string, string> = {
  completed: "bg-emerald-500",
  in_progress: "bg-amber-500",
  planned: "bg-slate-400",
};
const STATUS_LABEL: Record<string, string> = {
  completed: "Færdig",
  in_progress: "I gang",
  planned: "Planlagt",
};

function statusDot(s: string | null) {
  if (!s) return "bg-slate-300";
  return STATUS_DOT[s] ?? "bg-violet-400";
}
function statusLabel(s: string | null) {
  if (!s) return "Ingen status";
  return STATUS_LABEL[s] ?? s;
}

function SortableCard({ card, onEdit, onDelete }: { card: CardRow; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const inner = (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium leading-snug">{card.title}</h4>
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
          {card.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{card.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", statusDot(card.status))} />
              {statusLabel(card.status)}
            </span>
            {card.process_id && (
              <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                <Link2 className="h-3 w-3" /> proces
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-card p-3 shadow-sm hover:border-primary/40">
      {card.process_id ? (
        <Link to={`/process/${card.process_id}`} className="block">{inner}</Link>
      ) : inner}
    </div>
  );
}

function ColumnView({
  column, cards, onAddCard, onEditCard, onDeleteCard,
  onRenameColumn, onDeleteColumn, onMoveColumn, canMoveLeft, canMoveRight,
}: {
  column: RoadmapColumn;
  cards: CardRow[];
  onAddCard: () => void;
  onEditCard: (c: CardRow) => void;
  onDeleteCard: (c: CardRow) => void;
  onRenameColumn: (label: string) => void;
  onDeleteColumn: () => void;
  onMoveColumn: (dir: -1 | 1) => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
}) {
  const { setNodeRef } = useSortable({ id: `col:${column.id}`, data: { type: "column", columnId: column.id } });
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(column.label);
  useEffect(() => setLabel(column.label), [column.label]);

  return (
    <div ref={setNodeRef} className="flex w-80 shrink-0 flex-col rounded-xl border bg-muted/30 p-3">
      <div className="flex items-center gap-1 mb-3">
        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!canMoveLeft} onClick={() => onMoveColumn(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {editing ? (
          <Input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => { setEditing(false); if (label.trim() && label !== column.label) onRenameColumn(label.trim()); else setLabel(column.label); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setLabel(column.label); setEditing(false); } }}
            className="h-7 flex-1"
          />
        ) : (
          <button onClick={() => setEditing(true)} className="flex-1 text-left text-sm font-semibold px-1 truncate">
            {column.label}
          </button>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">{cards.length}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!canMoveRight} onClick={() => onMoveColumn(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDeleteColumn}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>

      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-[40px]">
          {cards.map((c) => (
            <SortableCard key={c.id} card={c} onEdit={() => onEditCard(c)} onDelete={() => onDeleteCard(c)} />
          ))}
        </div>
      </SortableContext>

      <Button variant="ghost" size="sm" className="mt-2 w-full justify-start text-muted-foreground" onClick={onAddCard}>
        <Plus className="mr-2 h-4 w-4" /> Tilføj kort
      </Button>
    </div>
  );
}

export default function RoadmapDetail() {
  const { id } = useParams<{ id: string }>();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogColumn, setDialogColumn] = useState<string | null>(null);
  const [dialogInitial, setDialogInitial] = useState<(CardDraft & { id?: string }) | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = async () => {
    if (!id) return;
    const { data: rm } = await supabase.from("roadmaps").select("*").eq("id", id).single();
    if (rm) {
      setRoadmap(rm as any);
      setNameDraft((rm as any).name);
    }
    const { data: cs } = await supabase
      .from("roadmap_cards")
      .select("*")
      .eq("roadmap_id", id)
      .order("order", { ascending: true });
    setCards((cs as CardRow[]) ?? []);
  };
  useEffect(() => { load(); }, [id]);

  const columns = useMemo(() => {
    return (roadmap?.columns ?? []).slice().sort((a, b) => a.order - b.order);
  }, [roadmap]);

  const cardsByColumn = useMemo(() => {
    const m = new Map<string, CardRow[]>();
    columns.forEach((c) => m.set(c.id, []));
    cards.forEach((c) => {
      if (!m.has(c.column_id)) m.set(c.column_id, []);
      m.get(c.column_id)!.push(c);
    });
    m.forEach((arr) => arr.sort((a, b) => a.order - b.order));
    return m;
  }, [cards, columns]);

  const persistColumns = async (next: RoadmapColumn[]) => {
    if (!roadmap) return;
    setRoadmap({ ...roadmap, columns: next });
    const { error } = await supabase.from("roadmaps").update({ columns: next as any }).eq("id", roadmap.id);
    if (error) { toast.error("Kunne ikke gemme kolonner"); load(); }
  };

  const renameColumn = (colId: string, label: string) => {
    if (!roadmap) return;
    persistColumns(roadmap.columns.map((c) => c.id === colId ? { ...c, label } : c));
  };

  const moveColumn = (colId: string, dir: -1 | 1) => {
    const sorted = columns.slice();
    const i = sorted.findIndex((c) => c.id === colId);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const next = arrayMove(sorted, i, j).map((c, idx) => ({ ...c, order: idx }));
    persistColumns(next);
  };

  const addColumn = () => {
    if (!roadmap) return;
    const next = [...roadmap.columns, { id: crypto.randomUUID(), label: "Ny kolonne", order: columns.length }];
    persistColumns(next);
  };

  const deleteColumn = async (colId: string) => {
    if (!roadmap) return;
    if (!confirm("Slet kolonnen og alle dens kort?")) return;
    const next = roadmap.columns.filter((c) => c.id !== colId).map((c, i) => ({ ...c, order: i }));
    await supabase.from("roadmap_cards").delete().eq("roadmap_id", roadmap.id).eq("column_id", colId);
    setCards((cs) => cs.filter((c) => c.column_id !== colId));
    persistColumns(next);
  };

  const saveName = async () => {
    if (!roadmap || !nameDraft.trim() || nameDraft === roadmap.name) { setEditingName(false); setNameDraft(roadmap?.name ?? ""); return; }
    const newName = nameDraft.trim();
    setRoadmap({ ...roadmap, name: newName });
    setEditingName(false);
    const { error } = await supabase.from("roadmaps").update({ name: newName }).eq("id", roadmap.id);
    if (error) toast.error("Kunne ikke gemme navn");
  };

  const openNewCard = (columnId: string) => {
    setDialogColumn(columnId);
    setDialogInitial(null);
    setDialogOpen(true);
  };
  const openEditCard = (card: CardRow) => {
    setDialogColumn(card.column_id);
    setDialogInitial({
      id: card.id, title: card.title, status: card.status,
      description: card.description, process_id: card.process_id,
    });
    setDialogOpen(true);
  };
  const saveCard = async (draft: CardDraft) => {
    if (!roadmap || !dialogColumn) return;
    if (draft.id) {
      const patch = {
        title: draft.title, status: draft.status,
        description: draft.description, process_id: draft.process_id,
      };
      setCards((cs) => cs.map((c) => c.id === draft.id ? { ...c, ...patch } : c));
      const { error } = await supabase.from("roadmap_cards").update(patch).eq("id", draft.id);
      if (error) { toast.error("Kunne ikke gemme"); load(); }
    } else {
      const order = (cardsByColumn.get(dialogColumn)?.length ?? 0);
      const { data, error } = await supabase.from("roadmap_cards").insert({
        roadmap_id: roadmap.id, column_id: dialogColumn, order,
        title: draft.title, status: draft.status,
        description: draft.description, process_id: draft.process_id,
      }).select("*").single();
      if (error || !data) { toast.error("Kunne ikke oprette kort"); return; }
      setCards((cs) => [...cs, data as CardRow]);
    }
  };
  const deleteCard = async (card: CardRow) => {
    if (!confirm("Slet dette kort?")) return;
    setCards((cs) => cs.filter((c) => c.id !== card.id));
    const { error } = await supabase.from("roadmap_cards").delete().eq("id", card.id);
    if (error) { toast.error("Kunne ikke slette"); load(); }
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) return;

    let targetCol: string | null = null;
    let targetIndex = -1;
    const overId = String(over.id);
    if (overId.startsWith("col:")) {
      targetCol = overId.slice(4);
      targetIndex = cardsByColumn.get(targetCol)?.length ?? 0;
    } else {
      const overCard = cards.find((c) => c.id === over.id);
      if (!overCard) return;
      targetCol = overCard.column_id;
      const list = cardsByColumn.get(targetCol) ?? [];
      targetIndex = list.findIndex((c) => c.id === overCard.id);
    }
    if (!targetCol) return;

    // Build new ordering
    const before = cards.slice();
    const sourceList = (cardsByColumn.get(activeCard.column_id) ?? []).filter((c) => c.id !== active.id);
    let destList = activeCard.column_id === targetCol
      ? sourceList
      : (cardsByColumn.get(targetCol) ?? []).slice();
    if (targetIndex < 0 || targetIndex > destList.length) targetIndex = destList.length;
    destList.splice(targetIndex, 0, { ...activeCard, column_id: targetCol });

    const updated = new Map<string, { column_id: string; order: number }>();
    if (activeCard.column_id !== targetCol) {
      sourceList.forEach((c, i) => updated.set(c.id, { column_id: c.column_id, order: i }));
    }
    destList.forEach((c, i) => updated.set(c.id, { column_id: targetCol!, order: i }));

    // Optimistic
    setCards((cs) => cs.map((c) => updated.has(c.id) ? { ...c, ...updated.get(c.id)! } : c));

    // Persist
    const updates = Array.from(updated.entries());
    const results = await Promise.all(updates.map(([cid, val]) =>
      supabase.from("roadmap_cards").update(val).eq("id", cid),
    ));
    if (results.some((r) => r.error)) {
      toast.error("Kunne ikke gemme rækkefølge");
      setCards(before);
    }
  };

  if (!roadmap) {
    return <div className="p-6 text-muted-foreground">Indlæser…</div>;
  }

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-background/80 backdrop-blur px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/roadmaps"><ArrowLeft className="mr-1 h-4 w-4" /> Tilbage</Link>
          </Button>
          {editingName ? (
            <Input
              autoFocus value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setNameDraft(roadmap.name); setEditingName(false); } }}
              className="h-9 max-w-md text-lg font-semibold"
            />
          ) : (
            <button onClick={() => setEditingName(true)} className="text-xl font-semibold hover:underline">
              {roadmap.name}
            </button>
          )}
          {roadmap.description && (
            <span className="text-sm text-muted-foreground truncate">— {roadmap.description}</span>
          )}
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={addColumn}>
              <Plus className="mr-1 h-4 w-4" /> Tilføj kolonne
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-4 items-start">
            {columns.map((col, idx) => (
              <ColumnView
                key={col.id}
                column={col}
                cards={cardsByColumn.get(col.id) ?? []}
                onAddCard={() => openNewCard(col.id)}
                onEditCard={openEditCard}
                onDeleteCard={deleteCard}
                onRenameColumn={(label) => renameColumn(col.id, label)}
                onDeleteColumn={() => deleteColumn(col.id)}
                onMoveColumn={(dir) => moveColumn(col.id, dir)}
                canMoveLeft={idx > 0}
                canMoveRight={idx < columns.length - 1}
              />
            ))}
            {columns.length === 0 && (
              <div className="text-sm text-muted-foreground py-12">Ingen kolonner. Tilføj én for at komme i gang.</div>
            )}
          </div>
          <DragOverlay>
            {activeCard ? (
              <div className="rounded-lg border bg-card p-3 shadow-lg w-72">
                <h4 className="text-sm font-medium">{activeCard.title}</h4>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <RoadmapCardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={dialogInitial}
        onSave={saveCard}
      />
    </div>
  );
}