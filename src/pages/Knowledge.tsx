import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface KItem {
  id: string; title: string; type: string; department_id: string | null; content: string; active: boolean;
}

export default function Knowledge() {
  const { isAdmin, departments } = useAuth();
  const [items, setItems] = useState<KItem[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", type: "Hard rule", department_id: "all", content: "" });

  const load = async () => {
    const { data } = await supabase.from("knowledge_items").select("*").order("created_at", { ascending: false });
    setItems((data as KItem[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!draft.title || !draft.content) { toast.error("Udfyld titel og indhold"); return; }
    const { error } = await supabase.from("knowledge_items").insert({
      title: draft.title, type: draft.type, content: draft.content,
      department_id: draft.department_id === "all" ? null : draft.department_id,
      active: true,
    });
    if (error) { toast.error(error.message); return; }
    setDraft({ title: "", type: "Hard rule", department_id: "all", content: "" });
    setOpen(false);
    toast.success("Tilføjet");
    load();
  };

  const toggleActive = async (k: KItem, v: boolean) => {
    await supabase.from("knowledge_items").update({ active: v }).eq("id", k.id);
    setItems((arr) => arr.map((x) => x.id === k.id ? { ...x, active: v } : x));
  };

  const remove = async (k: KItem) => {
    await supabase.from("knowledge_items").delete().eq("id", k.id);
    setItems((arr) => arr.filter((x) => x.id !== k.id));
  };

  const deptName = (id: string | null) => id ? (departments.find(d => d.id === id)?.name ?? "—") : "Alle";

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" />Vidensbank</h1>
          <p className="text-sm text-muted-foreground">Regler, skabeloner og eksempler til at forbedre processer.</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Tilføj</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Tilføj vidensitem</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Titel</Label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Type</Label>
                    <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["Hard rule", "Skabelon", "Eksempel"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Afdeling</Label>
                    <Select value={draft.department_id} onValueChange={(v) => setDraft({ ...draft, department_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Indhold</Label><Textarea rows={5} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={add}>Tilføj</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((k) => (
          <Card key={k.id} className="shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{k.title}</CardTitle>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Switch checked={k.active} onCheckedChange={(v) => toggleActive(k, v)} />
                    <Button size="icon" variant="ghost" onClick={() => remove(k)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                )}
              </div>
              <CardDescription className="flex gap-2">
                <Badge variant="outline">{k.type}</Badge>
                <Badge variant="secondary">{deptName(k.department_id)}</Badge>
                {!k.active && <Badge variant="outline" className="text-muted-foreground">Inaktiv</Badge>}
              </CardDescription>
            </CardHeader>
            <CardContent><p className="text-sm whitespace-pre-wrap text-muted-foreground">{k.content}</p></CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">Ingen items endnu.</p>}
      </div>
    </div>
  );
}
