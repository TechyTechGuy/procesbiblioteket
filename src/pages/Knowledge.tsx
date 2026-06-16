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
import { Plus, Trash2, BookOpen, Pencil, FileUp, FileText, Download, ExternalLink, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFile } from "@/lib/extractText";

interface KItem {
  id: string;
  title: string;
  type: string;
  department_id: string | null;
  content: string;
  active: boolean;
  file_path: string | null;
  file_name: string | null;
  file_mime: string | null;
  file_size_bytes: number | null;
  use_in_ai: boolean;
  scope: "global" | "department";
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export default function Knowledge() {
  const { isAdmin, role, departments, profile } = useAuth();
  const canManage = isAdmin || role === "process_owner";
  const [items, setItems] = useState<KItem[]>([]);
  const [open, setOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", type: "Hard rule", department_id: "all", content: "" });

  // Document upload dialog state
  const [docDraft, setDocDraft] = useState({
    title: "",
    type: "Code of Conduct",
    department_id: "all" as string,
    use_in_ai: false,
    file: null as File | null,
  });
  const [uploading, setUploading] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setDraft({ title: "", type: "Hard rule", department_id: "all", content: "" });
    setOpen(true);
  };

  const openEdit = (k: KItem) => {
    setEditingId(k.id);
    setDraft({
      title: k.title,
      type: k.type,
      department_id: k.department_id ?? "all",
      content: k.content,
    });
    setOpen(true);
  };

  const openUpload = () => {
    setDocDraft({ title: "", type: "Code of Conduct", department_id: "all", use_in_ai: false, file: null });
    setDocOpen(true);
  };

  const load = async () => {
    const { data } = await supabase.from("knowledge_items").select("*").order("created_at", { ascending: false });
    setItems((data as KItem[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!draft.title || !draft.content) { toast.error("Udfyld titel og indhold"); return; }
    const dept = draft.department_id === "all" ? null : draft.department_id;
    const payload = {
      title: draft.title,
      type: draft.type,
      content: draft.content,
      department_id: dept,
      scope: dept ? "department" : "global",
    };
    if (editingId) {
      const { error } = await supabase.from("knowledge_items").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Ændringer gemt");
    } else {
      const { error } = await supabase.from("knowledge_items").insert({ ...payload, active: true, created_by: profile?.id ?? null });
      if (error) { toast.error(error.message); return; }
      toast.success("Tilføjet");
    }
    setEditingId(null);
    setDraft({ title: "", type: "Hard rule", department_id: "all", content: "" });
    setOpen(false);
    load();
  };

  const uploadDoc = async () => {
    const f = docDraft.file;
    if (!docDraft.title.trim()) { toast.error("Udfyld titel"); return; }
    if (!f) { toast.error("Vælg en fil"); return; }
    const name = f.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) { toast.error("Kun .pdf og .docx er understøttet"); return; }
    if (f.size > MAX_BYTES) { toast.error("Filen er over 10 MB"); return; }
    if (!profile) return;

    setUploading(true);
    try {
      // Try text extraction (best effort)
      let extracted = "";
      try { extracted = await extractTextFromFile(f); } catch { /* ignore */ }

      const dept = docDraft.department_id === "all" ? null : docDraft.department_id;

      // 1) Insert row first to get id
      const { data: inserted, error: insErr } = await supabase.from("knowledge_items").insert({
        title: docDraft.title,
        type: docDraft.type,
        content: extracted ? extracted.slice(0, 500) + (extracted.length > 500 ? "…" : "") : `Dokument: ${f.name}`,
        department_id: dept,
        scope: dept ? "department" : "global",
        active: true,
        use_in_ai: docDraft.use_in_ai && !!extracted,
        extracted_text: extracted || null,
        file_name: f.name,
        file_mime: f.type || (name.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        file_size_bytes: f.size,
        created_by: profile.id,
      }).select("id").single();

      if (insErr || !inserted) throw insErr ?? new Error("Kunne ikke oprette");

      // 2) Upload file
      const path = `knowledge/${inserted.id}/${f.name}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, f, { upsert: true });
      if (upErr) {
        await supabase.from("knowledge_items").delete().eq("id", inserted.id);
        throw upErr;
      }

      // 3) Update with file_path
      await supabase.from("knowledge_items").update({ file_path: path }).eq("id", inserted.id);

      if (docDraft.use_in_ai && !extracted) {
        toast.warning("Filen er gemt, men teksten kunne ikke udtrækkes — 'Brug i AI' blev slået fra");
      } else {
        toast.success("Dokument uploadet");
      }
      setDocOpen(false);
      load();
    } catch (e: any) {
      toast.error("Upload fejlede: " + (e?.message ?? "ukendt fejl"));
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (k: KItem, v: boolean) => {
    await supabase.from("knowledge_items").update({ active: v }).eq("id", k.id);
    setItems((arr) => arr.map((x) => x.id === k.id ? { ...x, active: v } : x));
  };

  const toggleAi = async (k: KItem, v: boolean) => {
    if (v && !k.file_path && !k.content) { toast.error("Intet indhold at bruge"); return; }
    await supabase.from("knowledge_items").update({ use_in_ai: v }).eq("id", k.id);
    setItems((arr) => arr.map((x) => x.id === k.id ? { ...x, use_in_ai: v } : x));
  };

  const remove = async (k: KItem) => {
    if (k.file_path) {
      await supabase.storage.from("uploads").remove([k.file_path]);
    }
    await supabase.from("knowledge_items").delete().eq("id", k.id);
    setItems((arr) => arr.filter((x) => x.id !== k.id));
  };

  const openFile = async (k: KItem) => {
    if (!k.file_path) return;
    const { data, error } = await supabase.storage.from("uploads").createSignedUrl(k.file_path, 3600);
    if (error || !data) { toast.error("Kunne ikke åbne fil"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const downloadFile = async (k: KItem) => {
    if (!k.file_path) return;
    const { data, error } = await supabase.storage.from("uploads").createSignedUrl(k.file_path, 3600, { download: k.file_name ?? true });
    if (error || !data) { toast.error("Kunne ikke hente fil"); return; }
    window.location.href = data.signedUrl;
  };

  const deptName = (id: string | null) => id ? (departments.find(d => d.id === id)?.name ?? "—") : "Alle";

  const formatSize = (n: number | null) => {
    if (!n) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" />Vidensbank</h1>
          <p className="text-sm text-muted-foreground">Regler, skabeloner, dokumenter (fx Code of Conduct) og eksempler.</p>
        </div>
        {canManage && (
          <div className="flex gap-2 flex-wrap">
            <Dialog open={docOpen} onOpenChange={setDocOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={openUpload}><FileUp className="mr-2 h-4 w-4" />Upload dokument</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Upload PDF / Word-dokument</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Titel</Label>
                    <Input value={docDraft.title} onChange={(e) => setDocDraft({ ...docDraft, title: e.target.value })} placeholder="F.eks. Code of Conduct 2026" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Type</Label>
                      <Select value={docDraft.type} onValueChange={(v) => setDocDraft({ ...docDraft, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Code of Conduct", "Politik", "Dokument", "Skabelon", "Eksempel"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Afdeling</Label>
                      <Select value={docDraft.department_id} onValueChange={(v) => setDocDraft({ ...docDraft, department_id: v })} disabled={!isAdmin}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle (globalt)</SelectItem>
                          {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {!isAdmin && <p className="text-[11px] text-muted-foreground mt-1">Kun admin kan vælge globalt.</p>}
                    </div>
                  </div>
                  <div>
                    <Label>Fil (.pdf eller .docx, maks. 10 MB)</Label>
                    <Input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => setDocDraft({ ...docDraft, file: e.target.files?.[0] ?? null })} />
                    {docDraft.file && <p className="text-xs text-muted-foreground mt-1">{docDraft.file.name} · {formatSize(docDraft.file.size)}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">Brug i AI-forbedring</p>
                        <p className="text-xs text-muted-foreground">Indholdet udtrækkes og indgår som aktiv regel.</p>
                      </div>
                      <Switch checked={docDraft.use_in_ai} onCheckedChange={(v) => setDocDraft({ ...docDraft, use_in_ai: v })} />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={uploadDoc} disabled={uploading}>
                    {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploader…</> : <><FileUp className="mr-2 h-4 w-4" />Upload</>}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Tilføj regel</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingId ? "Rediger vidensitem" : "Tilføj vidensitem"}</DialogTitle></DialogHeader>
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
                      <Select value={draft.department_id} onValueChange={(v) => setDraft({ ...draft, department_id: v })} disabled={!isAdmin}>
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
                <DialogFooter>
                  <Button onClick={save}>{editingId ? "Gem ændringer" : "Tilføj"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="columns-1 md:columns-2 gap-3">
        {items.map((k) => (
          <Card key={k.id} className="shadow-card break-inside-avoid mb-3">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {k.file_path && <FileText className="h-4 w-4 text-muted-foreground" />}
                  {k.title}
                </CardTitle>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <Switch checked={k.active} onCheckedChange={(v) => toggleActive(k, v)} />
                    <Button size="icon" variant="ghost" onClick={() => openEdit(k)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(k)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                )}
              </div>
              <CardDescription className="flex flex-wrap gap-2">
                <Badge variant="outline">{k.type}</Badge>
                <Badge variant="secondary">{deptName(k.department_id)}</Badge>
                {k.file_path && (
                  <Badge variant={k.use_in_ai ? "default" : "outline"}>
                    {k.use_in_ai ? "Aktiv regel" : "Reference"}
                  </Badge>
                )}
                {!k.active && <Badge variant="outline" className="text-muted-foreground">Inaktiv</Badge>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {k.file_path ? (
                <>
                  <p className="text-xs text-muted-foreground">{k.file_name} · {formatSize(k.file_size_bytes)}</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => openFile(k)}>
                      <ExternalLink className="mr-2 h-3 w-3" />Åbn
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => downloadFile(k)}>
                      <Download className="mr-2 h-3 w-3" />Download
                    </Button>
                    {isAdmin && (
                      <label className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
                        Brug i AI
                        <Switch checked={k.use_in_ai} onCheckedChange={(v) => toggleAi(k, v)} />
                      </label>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{k.content}</p>
              )}
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">Ingen items endnu.</p>}
      </div>
    </div>
  );
}
