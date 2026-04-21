import { useParams, Link, useNavigate } from "react-router-dom";
import { useStore, scoreQuality } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { QualityMeter } from "@/components/QualityMeter";
import { ArrowLeft, Lock, Save, History } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Status } from "@/lib/types";
import { toast } from "sonner";

export default function ProcessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { processes, setProcesses, canSee, canEdit, currentUser } = useStore();
  const process = processes.find((p) => p.id === id);

  const [content, setContent] = useState(process?.content || "");
  const [status, setStatus] = useState<Status>(process?.status || "Draft");

  useEffect(() => {
    setContent(process?.content || "");
    setStatus(process?.status || "Draft");
  }, [process?.id]);

  if (!process) {
    return <div className="p-6"><Button variant="ghost" onClick={() => navigate("/library")}><ArrowLeft className="mr-2 h-4 w-4" />Tilbage</Button><p className="mt-4">Proces ikke fundet.</p></div>;
  }

  if (!canSee(process)) {
    return (
      <Card className="max-w-md mx-auto mt-12"><CardContent className="pt-6 text-center space-y-3">
        <Lock className="mx-auto h-10 w-10 text-warning" />
        <h2 className="font-semibold">Ingen adgang</h2>
        <p className="text-sm text-muted-foreground">Denne proces tilhører {process.department} – du er i {currentUser.department}.</p>
        <Button variant="outline" onClick={() => navigate("/library")}>Tilbage til bibliotek</Button>
      </CardContent></Card>
    );
  }

  const editable = canEdit(process);

  const save = () => {
    const now = new Date().toISOString();
    setProcesses((arr) => arr.map((p) => p.id === process.id ? {
      ...p,
      content,
      status,
      qualityScore: scoreQuality(content),
      updatedAt: now,
      versions: [...p.versions, { id: `${p.id}_v${p.versions.length + 1}`, content, createdBy: currentUser.name, createdAt: now, aiGenerated: false, notes: `Status: ${status}` }],
    } : p));
    toast.success("Gemt som ny version");
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/library")}><ArrowLeft className="mr-2 h-4 w-4" />Tilbage til bibliotek</Button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{process.title}</h1>
            <StatusBadge status={process.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{process.department} · Owner: {process.owner} · Opdateret {new Date(process.updatedAt).toLocaleDateString("da-DK")}</p>
        </div>
        <div className="w-48"><QualityMeter score={process.qualityScore} /></div>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Indhold</TabsTrigger>
          <TabsTrigger value="versions"><History className="mr-1 h-3 w-3" />Versioner ({process.versions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-3">
          <Card className="shadow-card"><CardContent className="pt-4 space-y-3">
            {!editable && (
              <p className="text-xs rounded bg-muted px-3 py-2 flex items-center gap-2">
                <Lock className="h-3 w-3" />Du har kun læseadgang til denne proces.
              </p>
            )}
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={20} className="font-mono text-xs" disabled={!editable} />
            {editable && (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Status:</span>
                  <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                    <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Draft", "In Review", "Published", "Archived"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={save}><Save className="mr-2 h-4 w-4" />Gem ny version</Button>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card className="shadow-card"><CardContent className="pt-4 divide-y">
            {[...process.versions].reverse().map((v, i) => (
              <div key={v.id} className="py-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">v{process.versions.length - i} {v.aiGenerated && <span className="ml-1 text-xs text-accent">· AI</span>}</span>
                  <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString("da-DK")}</span>
                </div>
                <p className="text-xs text-muted-foreground">{v.createdBy} — {v.notes}</p>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}