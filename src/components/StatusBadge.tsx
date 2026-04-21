import { Badge } from "@/components/ui/badge";
import { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<Status, string> = {
  Draft: "bg-muted text-muted-foreground hover:bg-muted",
  "In Review": "bg-warning/15 text-warning-foreground border-warning/30 hover:bg-warning/15",
  Published: "bg-success/15 text-success border-success/30 hover:bg-success/15",
  Archived: "bg-secondary text-secondary-foreground hover:bg-secondary",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={cn("text-xs", styles[status])}>
      {status}
    </Badge>
  );
}