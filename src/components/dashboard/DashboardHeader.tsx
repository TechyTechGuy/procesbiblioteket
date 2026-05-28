import { LayoutGrid, List, Columns, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ViewMode } from "@/pages/Dashboard";

interface Props {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  onAddClick: () => void;
}

export function DashboardHeader({ view, onViewChange, onAddClick }: Props) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-semibold">Mit procesoverblik</h1>
      <div className="flex items-center gap-2">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && onViewChange(v as ViewMode)}
          className="border rounded-lg"
        >
          <ToggleGroupItem value="grid" aria-label="Gridvisning" className="px-2.5">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="Listevisning" className="px-2.5">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="group" aria-label="Grupperingsvisning" className="px-2.5">
            <Columns className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        <Button onClick={onAddClick} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Tilføj proces
        </Button>
      </div>
    </div>
  );
}
