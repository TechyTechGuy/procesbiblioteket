import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Map as MapIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ColumnType = "quarters" | "steps" | "months" | "custom";

interface RoadmapRow {
  id: string;
  name: string;
  description: string | null;
  column_type: string;
  columns: { id: string; label: string; order: number }[];
  card_count?: number;
}

const MONTHS_DA = ["Jan","Feb","Mar","Apr","Maj","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

function makeColumns(type: ColumnType, year: number) {
  const mk = (labels: string[]) => labels.map((label, i) => ({ id: crypto.randomUUID(), label, order: i }));
  if (type === "quarters") return mk([`Q1 ${year}`, `Q2 ${year}`, `Q3 ${year}`, `Q4 ${year}`]);
  if (type === "steps") return mk(["Step 1", "Step 2", "Step 3"]);
  if (type === "months") return mk(MONTHS_DA);
  return mk(["Kolonne 1", "Kolonne 2"]);
}

export default function Roadmaps() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RoadmapRow[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState<ColumnType>("quarters");
  const [year, setYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data: rmps } = await supabase
      .from("roadmaps")
      .select("id, name, description, column_type, columns")
      .order("created_at", { ascending: false });
    const list = (rmps as RoadmapRow[]) ?? [];
    if (list.length) {
      const ids = list.map((r) => r.id);
      const { data: cards } = await supabase
        .from("roadmap_cards")
        .select("roadmap_id")
        .in("roadmap_id", ids);
      const counts = new Map<string, number>();
      (cards ?? []).forEach((c: any) => counts.set(c.roadmap_id, (counts.get(c.roadmap_id) ?? 0) + 1));
      list.forEach((r) => (r.card_count = counts.get(r.id) ?? 0));
    }
    setRows(list);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) { toast.error("Navn er påkrævet"); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const columns = makeColumns(type, year);
    const { data, error } = await supabase
      .from("roadmaps")
      .insert({
        name: name.trim(),
        description: desc.trim() || null,
        column_type: type,
        columns: columns as any,
        created_by: u.user?.id ?? null,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) { toast.error("Kunne ikke oprette roadmap"); return; }
    setOpen(false);
    setName(""); setDesc(""); setType("quarters");
    navigate(`/roadmaps/${data!.id}`);
  };

  const remove = async (id: string) => {
    if (!confirm("Slet dette roadmap?")) return;
    const { error } = await supabase.from("roadmaps").delete().eq("id", id);
    if (error) { toast.error("Kunne ikke slette"); return; }
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Roadmaps</h1>
          <p className="text-sm text-muted-foreground">Visuelle roadmaps og projektmaps for dine processer.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nyt roadmap</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nyt roadmap</DialogTitle>
              <DialogDescription>Vælg en kolonnetype for at komme hurtigt i gang.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Navn</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fx Q2 lanceringer" />
              </div>
              <div className="space-y-2">
                <Label>Beskrivelse</Label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Valgfri beskrivelse" />
              </div>
              <div className="space-y-2">
                <Label>Kolonnetype</Label>
                <Select value={type} onValueChange={(v) => setType(v as ColumnType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarters">Kvartaler (Q1–Q4)</SelectItem>
                    <SelectItem value="steps">Steps (Step 1, 2, 3)</SelectItem>
                    <SelectItem value="months">Måneder (Jan–Dec)</SelectItem>
                    <SelectItem value="custom">Brugerdefineret</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {type === "quarters" && (
                <div className="space-y-2">
                  <Label>Årstal</Label>
                  <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annullér</Button>
              <Button onClick={create} disabled={saving}>Opret</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <MapIcon className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p>Ingen roadmaps endnu. Klik på "Nyt roadmap" for at oprette det første.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.id} className="group relative hover:border-primary/40 transition-colors">
              <CardContent className="p-5">
                <Link to={`/roadmaps/${r.id}`} className="block space-y-2">
                  <div className="flex items-start gap-2">
                    <MapIcon className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold leading-tight truncate">{r.name}</h3>
                      {r.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2">
                    <span>{r.columns?.length ?? 0} kolonner</span>
                    <span>•</span>
                    <span>{r.card_count ?? 0} kort</span>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
                  onClick={() => remove(r.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}