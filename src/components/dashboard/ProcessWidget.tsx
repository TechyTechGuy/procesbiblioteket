import { Star, X, GripVertical, Building2, User, Clock } from "lucide-react";
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
}

export function ProcessWidget({
  process: p,
  isFav,
  onToggleFav,
  onRemove,
  onOpen,
  isDragging,
  dragHandleProps,
}: Props) {
  const dotColor = DEPT_COLORS[p.department_name] ?? "bg-muted-foreground";
  const tags = p.tags ?? [];

  return (
    <div
      className={cn(
        "group relative bg-card border rounded-xl p-4 cursor-pointer transition-all",
        "hover:border-primary/30 hover:shadow-card",
        isDragging && "opacity-40 shadow-elegant"
      )}
      onClick={onOpen}
    >
      <div
        {...dragHandleProps}
        className="absolute top-2 left-2 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute top-1.5 right-7 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
          isFav && "opacity-100 text-warning"
        )}
        onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
        aria-label="Favorit"
      >
        <Star className={cn("h-3.5 w-3.5", isFav && "fill-warning")} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1.5 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label="Fjern widget"
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 pl-4">
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)} />
        {p.department_name}
      </div>

      <p className="text-sm font-medium leading-snug mb-2.5 pr-2">{p.title}</p>

      <StatusBadge status={p.status} />

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 mb-2.5">
        <User className="h-3 w-3 flex-shrink-0" />
        {p.owner_name}
      </div>

      <QualityMeter score={p.qualityScore ?? 0} />

      {tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-2.5">
          {tags.slice(0, 3).map((t) => (
            <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border">
              {t}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2.5">
        <Clock className="h-3 w-3" />
        {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true, locale: da })}
      </div>
    </div>
  );
}
