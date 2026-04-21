import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, scoreQuality } from "@/lib/store";
import { Wand2, Save, FileUp, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { QualityMeter } from "@/components/QualityMeter";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function UploadImprove() {
  const { departments, currentUser, setProcesses, knowledge } = useStore();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState(currentUser.department);
  const [draft, setDraft] = useState("");
  const [improved, setImproved] = useState("");
  const [findings, setFindings] = useState<{ ok: string[]; missing: string[] }>({ ok: [], missing: [] });

  const handleFile = async (f: File) => {
    const text = await f.text();
    setDraft(text);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const improve = () => {
    if (!draft.trim()) { toast.error("Tilføj først et udkast"); return; }
    const sections = ["Formål", "Scope", "Roller (RACI)", "Trigger", "Trin-for-trin", "Inputs/Outputs", "Kontroller & risici", "SLA & KPI", "Eskalering"];
    const t = draft.toLowerCase();
    const ok: string[] = [];
    const missing: string[] = [];
    sections.forEach((s) => (t.includes(s.toLowerCase().split(" ")[0]) ? ok.push(s) : missing.push(s)));

    const result = `# ${title || "Forbedret proces"}\n\n## Formål\n${draft.split("\n")[0] || "[Beskriv formål]"}\n\n## Scope\n[Afgræns hvad processen dækker]\n\n## Roller (RACI)\n- Owner: ${currentUser.name}\n- Ansvarlig: [navn]\n- Konsulteret: [team]\n\n## Trin-for-trin\n${draft.split("\n").filter(Boolean).map((l, i) => `${i + 1}. ${l.replace(/^[-*]\s*/, "")}`).join("\n")}\n\n## SLA & KPI\n- Svartid: [X dage]\n- Måles på: [KPI]\n\n## Eskalering\n[Hvem og hvornår]\n\n---\n_AI-genereret udkast baseret på vidensbank (${knowledge.filter(k => k.active).length} aktive regler)._`;

    setImproved(result);
    setFindings({ ok, missing });
    toast.success("Forslag genereret");
  };

  const save = () => {
    if (!title.trim() || !improved) { toast.error("Mangler titel eller indhold"); return; }
    const id = `p_${Date.now().toString(16)}`;
    const now = new Date().toISOString();
    setProcesses((arr) => [
      {
        id, title, department, status: "Draft", owner: currentUser.name,
        tags: [department.toLowerCase(), "ny"],
        content: improved,
        qualityScore: scoreQuality(improved),
        updatedAt: now,
        versions: [{ id: `${id}_v1`, content: improved, createdBy: currentUser.name, createdAt: now, aiGenerated: true, notes: "AI-forbedret første version" }],
      },
      ...arr,
    ]);
    toast.success("Proces gemt i biblioteket");
    navigate(`/process/${id}`);
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
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="file" className="text-xs">Upload fil (valgfri)</Label>
              <Input id="file" type="file" accept=".txt,.md" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Indsæt dit procesudkast her..." rows={12} className="font-mono text-xs" />
            <Button onClick={improve} className="w-full bg-gradient-primary hover:opacity-90 transition-smooth">
              <Wand2 className="mr-2 h-4 w-4" />Forbedr med AI
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" />Forbedret forslag</CardTitle>
            <CardDescription>Baseret på {knowledge.filter(k => k.active).length} regler i vidensbanken</CardDescription>
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
                <Button onClick={save} variant="default" className="w-full">
                  <Save className="mr-2 h-4 w-4" />Gem i bibliotek
                </Button>
              </>
            ) : (
              <div className="rounded-lg border-2 border-dashed p-12 text-center text-sm text-muted-foreground">
                Forslaget vises her, når du har klikket på <span className="font-medium">Forbedr med AI</span>.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}