import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortOption } from "@/pages/Dashboard";
import { STATUSES } from "@/lib/types";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  sortBy: SortOption;
  onSortChange: (v: SortOption) => void;
  filterStatus: string;
  onFilterStatusChange: (v: string) => void;
  filterDept: string;
  onFilterDeptChange: (v: string) => void;
  departments: string[];
  onAIClick: () => void;
}

export function DashboardToolbar({
  search, onSearchChange,
  sortBy, onSortChange,
  filterStatus, onFilterStatusChange,
  filterDept, onFilterDeptChange,
  departments,
  onAIClick,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søg processer..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={onAIClick} className="gap-1.5 h-9">
          <Sparkles className="h-4 w-4" />
          Find med AI
        </Button>
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Brugerdefineret rækkefølge</SelectItem>
            <SelectItem value="title">Navn A–Z</SelectItem>
            <SelectItem value="score">Kvalitet (høj–lav)</SelectItem>
            <SelectItem value="updated">Senest opdateret</SelectItem>
            <SelectItem value="favs">Favoritter først</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {["all", ...STATUSES].map((s) => (
          <Badge
            key={s}
            variant={filterStatus === s ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => onFilterStatusChange(s)}
          >
            {s === "all" ? "Alle statusser" : s}
          </Badge>
        ))}
        <span className="text-border">|</span>
        {["all", ...departments].map((d) => (
          <Badge
            key={d}
            variant={filterDept === d ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => onFilterDeptChange(d)}
          >
            {d === "all" ? "Alle afdelinger" : d}
          </Badge>
        ))}
      </div>
    </div>
  );
}
