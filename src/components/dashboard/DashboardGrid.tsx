import { useState } from "react";
import { Process } from "@/lib/types";
import { ProcessWidget } from "@/components/dashboard/ProcessWidget";
import { ProcessListRow } from "@/components/dashboard/ProcessListRow";
import { ViewMode } from "@/pages/Dashboard";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEPT_COLORS: Record<string, string> = {
  HR: "bg-purple-400",
  Økonomi: "bg-emerald-500",
  Support: "bg-blue-400",
  IT: "bg-gray-400",
  Marketing: "bg-orange-400",
  Legal: "bg-pink-400",
};

interface Props {
  processes: Process[];
  view: ViewMode;
  favIds: string[];
  onToggleFav: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onOpen: (p: Process) => void;
  loading: boolean;
}

export function DashboardGrid({ processes, view, favIds, onToggleFav, onRemove, onReorder, onOpen, loading }: Props) {
  const [dragSrc, setDragSrc] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  function dragHandleProps(id: string) {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        setDragSrc(id);
        e.dataTransfer.effectAllowed = "move";
      },
      onDragEnd: () => { setDragSrc(null); setDragOver(null); },
    } as React.HTMLAttributes<HTMLDivElement>;
  }

  function dropProps(id: string) {
    return {
      onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOver(id); },
      onDragLeave: () => setDragOver(null),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        if (dragSrc && dragSrc !== id) onReorder(dragSrc, id);
        setDragSrc(null);
        setDragOver(null);
      },
    };
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-secondary/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (processes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed rounded-xl text-muted-foreground">
        <LayoutDashboard className="h-8 w-8" />
        <p className="font-medium">Ingen processer matcher</p>
        <p className="text-sm">Prøv at justere filtre eller søgning</p>
      </div>
    );
  }

  if (view === "group") {
    const groups: Record<string, Process[]> = {};
    processes.forEach((p) => {
      if (!groups[p.department_name]) groups[p.department_name] = [];
      groups[p.department_name].push(p);
    });

    return (
      <div className="space-y-4">
        {Object.entries(groups).map(([dept, procs]) => (
          <div key={dept}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${DEPT_COLORS[dept] ?? "bg-muted-foreground"}`} />
              <span className="text-sm font-medium">{dept}</span>
              <span className="text-xs text-muted-foreground">{procs.length} processer</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {procs.map((p) => (
                <div key={p.id} {...dropProps(p.id)}
                  className={dragOver === p.id && dragSrc !== p.id ? "ring-2 ring-primary rounded-xl" : ""}>
                  <ProcessWidget
                    process={p}
                    isFav={favIds.includes(p.id)}
                    onToggleFav={() => onToggleFav(p.id)}
                    onRemove={() => onRemove(p.id)}
                    onOpen={() => onOpen(p)}
                    isDragging={dragSrc === p.id}
                    dragHandleProps={dragHandleProps(p.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="border rounded-xl overflow-hidden">
        {processes.map((p, i) => (
          <div key={p.id} {...dropProps(p.id)}
            className={dragOver === p.id && dragSrc !== p.id ? "ring-2 ring-inset ring-primary" : ""}>
            <ProcessListRow
              process={p}
              isFav={favIds.includes(p.id)}
              onToggleFav={() => onToggleFav(p.id)}
              onRemove={() => onRemove(p.id)}
              onOpen={() => onOpen(p)}
              isDragging={dragSrc === p.id}
              dragHandleProps={dragHandleProps(p.id)}
              isLast={i === processes.length - 1}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {processes.map((p) => (
        <div key={p.id} {...dropProps(p.id)}
          className={dragOver === p.id && dragSrc !== p.id ? "ring-2 ring-primary rounded-xl" : ""}>
          <ProcessWidget
            process={p}
            isFav={favIds.includes(p.id)}
            onToggleFav={() => onToggleFav(p.id)}
            onRemove={() => onRemove(p.id)}
            onOpen={() => onOpen(p)}
            isDragging={dragSrc === p.id}
            dragHandleProps={dragHandleProps(p.id)}
          />
        </div>
      ))}
    </div>
  );
}
