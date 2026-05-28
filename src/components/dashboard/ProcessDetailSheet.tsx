import { Star, User, Clock, Building2 } from "lucide-react";
import { Process } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { QualityMeter } from "@/components/QualityMeter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Props {
  process: Process | null;
  isFav: boolean;
  onToggleFav: () => void;
  onClose: () => void;
}

export function ProcessDetailSheet({ process: p, isFav, onToggleFav, onClose }: Props) {
  if (!p) return null;

  return (
    <Sheet open={!!p} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="p-4 pb-3 border-b">
          <div className="flex items-start justify-between gap-2 pr-8">
            <SheetTitle className="text-left leading-snug">{p.title}</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7 flex-shrink-0 mt-0.5", isFav && "text-warning")}
              onClick={onToggleFav}
              aria-label="Favorit"
            >
              <Star className={cn("h-4 w-4", isFav && "fill-warning")} />
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={p.status} />
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {p.department_name}
            </span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Beskrivelse</p>
            <div className="bg-secondary/50 rounded-lg p-3 text-sm text-muted-foreground leading-relaxed">
              {p.content || "Ingen beskrivelse tilgængelig."}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Procesejer</p>
              <p className="text-sm flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                {p.owner_name}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Sidst opdateret</p>
              <p className="text-sm flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true, locale: da })}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Kvalitetsscore</p>
            <QualityMeter score={p.qualityScore ?? 0} />
          </div>

          {p.tags?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Tags</p>
              <div className="flex gap-1.5 flex-wrap">
                {p.tags.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-secondary border text-secondary-foreground">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
