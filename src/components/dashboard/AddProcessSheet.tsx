import { useState } from "react";
import { Search } from "lucide-react";
import { Process } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  allProcesses: Process[];
  pinnedIds: string[];
  onTogglePin: (id: string, checked: boolean) => void;
}

export function AddProcessSheet({ open, onClose, allProcesses, pinnedIds, onTogglePin }: Props) {
  const [q, setQ] = useState("");

  const filtered = allProcesses.filter((p) => {
    const s = q.toLowerCase();
    return !s || p.title.toLowerCase().includes(s) || p.department_name?.toLowerCase().includes(s);
  });

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="p-4 pb-3 border-b">
          <SheetTitle>Tilføj processer</SheetTitle>
        </SheetHeader>
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Søg..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-secondary/50 transition-colors"
            >
              <Checkbox
                checked={pinnedIds.includes(p.id)}
                onCheckedChange={(v) => onTogglePin(p.id, !!v)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.department_name}</p>
              </div>
              <StatusBadge status={p.status} />
            </label>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
