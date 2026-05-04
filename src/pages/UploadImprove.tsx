import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, scoreQuality } from "@/lib/auth";
import { Wand2, Save, FileUp, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { QualityMeter } from "@/components/QualityMeter";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import mammoth from "mammoth";

export default function UploadImprove() {
  const { departments, profile, canEdit } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [improved, setImproved] = useState("");
  const [findings, setFindings] = useState<{ ok: string[]; missing: string[] }>({ ok: [], missing: [] });
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedImages, setExtractedImages] = useState<{ name: string; dataUrl: string }[]>([]);

  useEffect(() => {
    supabase.from("knowledge_items").select("id", { count: "exact", head: true }).eq("active", true)
      .then(({ count }) => setKnowledgeCount(count ?? 0));
  }, []);

  useEffect(() => {
    if (!departmentId && profile?.department_id) setDepartmentId(profile.department_id);
  }, [profile?.department_id, departmentId]);

  const handleFile = async (f: File) => {
    setFile(f);
    const name = f.name.toLowerCase();
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    try {
      if (name.endsWith(".docx")) {
        const arrayBuffer = await f.arrayBuffer();
        const images: { name: string; dataUrl: string }[] = [];
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            convertImage: mammoth.images.imgElement(async (image) => {
              const buffer = await image.read("base64");
              const dataUrl = `data:${image.contentType};base64,${buffer}`;
              images.push({ name: `image-${images.length + 1}`, dataUrl });
              return { src: dataUrl };
            }),
          }
        );
        const textResult = await mammoth.extractRawText({ arrayBuffer });
        setDraft(textResult.value);
        setExtractedImages(images);
        if (images.length > 0) {
          toast.success(`Word-dokument indlæst (${images.length} billede(r) fundet)`);
        } else {
          toast.success("Word-dokument indlæst");
        }
        // store html for potential later use (not currently shown)
        void result;
      } else if (name.endsWith(".doc")) {
        toast.error("Gamle .doc-filer understøttes ikke. Gem som .docx.");
      } else {
        const text = await f.text();
        setDraft(text);
        setExtractedImages([]);
      }
    } catch (err: any) {
      toast.error("Kunne ikke læse fil: " + (err?.message ?? "ukendt fejl"));
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, []);

  const improve = () => {
    if (!draft.trim()) { toast.error("Tilføj først et udkast"); return; }
    const sections = ["Formål", "Scope", "Roller (RACI)", "Trigger", "Trin-for-trin", "Inputs/Outputs", "Kontroller & risici", "SLA & KPI", "Eskalering"];
    const t = draft.toLowerCase();
    const ok: string[] = [];
    const missing: string[] = [];
    sections.forEach((s) => (t.includes(s.toLowerCase().split(" ")[0]) ? ok.push(s) : missing.push(s)));

    const result = `# ${title || "Forbedret proces"}\n\n## Formål\n${draft.split("\n")[0] || "[Beskriv formål]"}\n\n## Scope\n[Afgræns hvad processen dækker]\n\n## Roller (RACI)\n- Owner: ${profile?.full_name ?? ""}\n- Ansvarlig: [navn]\n- Konsulteret: [team]\n\n## Trin-for-trin\n${draft.split("\n").filter(Boolean).map((l, i) => `${i + 1}. ${l.replace(/^[-*]\s*/, "")}`).join("\n")}\n\n## SLA & KPI\n- Svartid: [X dage]\n- Måles på: [KPI]\n\n## Eskalering\n[Hvem og hvornår]\n\n---\n_Udkast baseret på vidensbank (${knowledgeCount} aktive regler)._`;

    setImproved(result);
    setFindings({ ok, missing });
    toast.success("Forslag genereret");
  };

  const save = async () => {
    if (!title.trim() || !improved) { toast.error("Mangler titel eller indhold"); return; }
    if (!departmentId) { toast.error("Vælg en afdeling"); return; }
    if (!profile) return;
    if (!canEdit) { toast.error("Du har ikke rettigheder til at oprette processer"); return; }

    let filePath: string | null = null;
    if (file) {
      const path = `${profile.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file);
      if (upErr) { toast.error("Filupload fejlede: " + upErr.message); return; }
      filePath = path;
      await supabase.from("uploads").insert({
        file_path: path, original_text: draft, title, department_id: departmentId, created_by: profile.id,
      });
    } else if (draft) {
      await supabase.from("uploads").insert({
        file_path: null, original_text: draft, title, department_id: departmentId, created_by: profile.id,
      });
    }

    const { data: proc, error: procErr } = await supabase.from("processes").insert({
      title, content: improved, department_id: departmentId, status: "Draft",
      owner_id: profile.id, owner_name: profile.full_name,
      tags: [(departments.find(d => d.id === departmentId)?.name ?? "").toLowerCase(), "ny"],
      quality_score: scoreQuality(improved),
    }).select("id").single();

    if (procErr || !proc) { toast.error(procErr?.message ?? "Kunne ikke gemme"); return; }

    await supabase.from("process_versions").insert({
      process_id: proc.id, content: improved,
      created_by_id: profile.id, created_by_name: profile.full_name,
      ai_generated: true, notes: "Første version (forbedret udkast)",
    });

    toast.success("Proces gemt i biblioteket");
    navigate(`/process/${proc.id}`);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Upload & forbedr proces</h1>
        <p className="text-sm text-muted-foreground">Smid et halvfærdigt udkast ind — få et struktureret forslag tilbage.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileUp className="h-4 w-4" />Dit udkast</CardTitle>
            <CardDescription>Indsæt tekst eller upload en .txt/.md fil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="title">Titel</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="F.eks. Onboarding ny medarbejder" />
              </div>
              <div>
                <Label>Afdeling</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger><SelectValue placeholder="Vælg" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="file" className="text-xs">Upload fil (valgfri)</Label>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`rounded-lg border-2 border-dashed p-4 text-center text-xs transition-smooth ${isDragging ? "border-primary bg-primary/5" : "border-muted"}`}
              >
                <Input
                  id="file"
                  type="file"
                  accept=".txt,.md,.docx"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <p className="mt-2 text-muted-foreground">
                  Træk og slip .docx, .txt eller .md filer her
                </p>
                {file && (
                  <p className="mt-1 text-success">Valgt: {file.name}</p>
                )}
              </div>
            </div>
            {extractedImages.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-2">
                <p className="text-xs font-medium mb-2">Billeder fra dokumentet ({extractedImages.length})</p>
                <div className="grid grid-cols-4 gap-2">
                  {extractedImages.map((img, i) => (
                    <img key={i} src={img.dataUrl} alt={img.name} className="rounded border w-full h-20 object-cover" />
                  ))}
                </div>
              </div>
            )}
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Indsæt dit procesudkast her..." rows={12} className="font-mono text-xs" />
            <Button onClick={improve} className="w-full bg-gradient-primary hover:opacity-90 transition-smooth">
              <Wand2 className="mr-2 h-4 w-4" />Forbedr forslag
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" />Forbedret forslag</CardTitle>
            <CardDescription>Baseret på {knowledgeCount} aktive regler i vidensbanken</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {improved ? (
              <>
                <QualityMeter score={scoreQuality(improved)} />
                <Textarea value={improved} onChange={(e) => setImproved(e.target.value)} rows={12} className="font-mono text-xs" />
                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  <div className="rounded-lg border bg-success/5 p-2">
                    <p className="font-medium text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Opfyldte ({findings.ok.length})</p>
                    <ul className="mt-1 space-y-0.5">{findings.ok.map((s) => <li key={s}>· {s}</li>)}</ul>
                  </div>
                  <div className="rounded-lg border bg-destructive/5 p-2">
                    <p className="font-medium text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />Mangler ({findings.missing.length})</p>
                    <ul className="mt-1 space-y-0.5">{findings.missing.map((s) => <li key={s}>· {s}</li>)}</ul>
                  </div>
                </div>
                <Button onClick={save} variant="default" className="w-full" disabled={!canEdit}>
                  <Save className="mr-2 h-4 w-4" />Gem i bibliotek
                </Button>
                {!canEdit && <p className="text-xs text-muted-foreground text-center">Din rolle (Viewer) kan ikke oprette processer.</p>}
              </>
            ) : (
              <div className="rounded-lg border-2 border-dashed p-12 text-center text-sm text-muted-foreground">
                Forslaget vises her, når du har klikket på <span className="font-medium">Forbedr forslag</span>.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
