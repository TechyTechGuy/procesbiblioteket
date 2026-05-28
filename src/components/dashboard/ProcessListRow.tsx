import { Star, X, GripVertical, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { QualityMeter } from "@/components/QualityMeter";
import { Process } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";

const DEPT_COLORS: Record<string, string> = {
  HR: "bg-purple-400",
  Økonomi: "bg-emerald-500",
  Support: "bg-blue-400",
  IT: "bg-gray-400",
  Marketing: "bg-orange-400",
  Legal: "bg-pink-400",
};

interface Props {
  process: Process;
  isFav: boolean;
  onToggleFav: () => void;
  onRemove: () => void;
  onOpen: () => void;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isLast?: boolean;
}

export function ProcessListRow({
  process: p,
  isFav,
  onToggleFav,
  onRemove,
  onOpen,
  isDragging,
  dragHandleProps,
  isLast,
}: Props) {
  const dotColor = DEPT_COLORS[p.department_name] ?? "bg-muted-foreground";
  const tags = p.tags ?? [];

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-3 bg-card cursor-pointer transition-colors hover:bg-secondary/40",
        !isLast && "border-b",
        isDragging && "opacity-40"
      )}
      onClick={onOpen}
    >
      <div
        {...dragHandleProps}
        className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className={cn("h-6 w-6 flex-shrink-0", isFav ? "text-warning" : "text-muted-foreground/40 opacity-0 group-hover:opacity-100")}
        onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
        aria-label="Favorit"
      >
        <Star className={cn("h-3.5 w-3.5", isFav && "fill-warning")} />
      </Button>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{p.title}</p>
          <p className="text-xs text-muted-foreground">{p.department_name}</p>
        </div>
      </div>

      <div className="flex-shrink-0">
        <StatusBadge status={p.status} />
      </div>

      <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 min-w-[110px]">
        <User className="h-3 w-3" />
        {p.owner_name}
      </div>

      <div className="hidden lg:block min-w-[100px] flex-shrink-0">
        <QualityMeter score={p.qualityScore ?? 0} />
      </div>

      <div className="hidden lg:flex gap-1 flex-shrink-0">
        {tags.slice(0, 2).map((t) => (
          <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-secondary border">
            {t}
          </span>
        ))}
        {tags.length > 2 && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-secondary border">+{tags.length - 2}</span>
        )}
      </div>

      <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 min-w-[80px] text-right">
        <Clock className="h-3 w-3" />
        {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true, locale: da })}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label="Fjern"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
