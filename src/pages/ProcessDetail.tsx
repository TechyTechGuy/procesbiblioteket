import { useParams, useNavigate } from "react-router-dom";
import { useAuth, scoreQuality } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { QualityMeter } from "@/components/QualityMeter";
import { ArrowLeft, Lock, Save, History, Copy, FileText, Pencil, Eye, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { Status, STATUSES } from "@/lib/types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const proseClasses =
  "prose prose-sm max-w-none dark:prose-invert rounded-md border bg-background p-4 " +
  "[&_table]:w-full [&_table]:border-collapse [&_table]:my-2 " +
  "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left " +
  "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 " +
  "[&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-semibold [&_h3]:font-semibold " +
  "[&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded";

interface ProcessRow {
  id: string; title: string; content: string; status: Status; owner_name: string;
  department_id: string; tags: string[]; quality_score: number; updated_at: string;
}
interface VersionRow {
  id: string; content: string; created_by_name: string; created_at: string;
  ai_generated: boolean; notes: string | null;
}

export default function ProcessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit, isAdmin, profile, departments } = useAuth();
  const [process, setProcess] = useState<ProcessRow | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<Status>("Draft");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    if (!id) return;
    const { data, error } = await supabase.from("processes").select("*").eq("id", id).maybeSingle();
    if (error || !data) { setNotFound(true); setLoading(false); return; }
    setProcess(data as ProcessRow);
    setContent(data.content); setStatus(data.status as Status);
    const { data: vers } = await supabase
      .from("process_versions").select("*").eq("process_id", id)
      .order("created_at", { ascending: false });
    setVersions((vers as VersionRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Indlæser...</p>;

  if (notFound || !process) {
    return (
      <Card className="max-w-md mx-auto mt-12"><CardContent className="pt-6 text-center space-y-3">
        <Lock className="mx-auto h-10 w-10 text-warning" />
        <h2 className="font-semibold">Ingen adgang eller findes ikke</h2>
        <p className="text-sm text-muted-foreground">Du har ikke adgang til denne proces, eller den findes ikke.</p>
        <Button variant="outline" onClick={() => navigate("/library")}>Tilbage til bibliotek</Button>
      </CardContent></Card>
    );
  }

  const editable = canEdit;
  const deptName = departments.find((d) => d.id === process.department_id)?.name ?? "—";

  const save = async () => {
    const newScore = scoreQuality(content);
    const { error: upErr } = await supabase.from("processes").update({
      content, status, quality_score: newScore,
    }).eq("id", process.id);
    if (upErr) { toast.error(upErr.message); return; }
    const { error: vErr } = await supabase.from("process_versions").insert({
      process_id: process.id,
      content,
      created_by_id: profile?.id,
      created_by_name: profile?.full_name ?? "",
      ai_generated: false,
      notes: `Status: ${status}`,
    });
    if (vErr) { toast.error(vErr.message); return; }
    toast.success("Gemt som ny version");
    setIsEditing(false);
    load();
  };

  const copyMarkdown = () => {
    navigator.clipboard.writeText(content).then(() => toast.success("Markdown kopieret"));
  };

  const copyAsText = () => {
    const el = contentRef.current;
    const text = el ? (el.innerText || el.textContent || content) : content;
    navigator.clipboard.writeText(text).then(() => toast.success("Tekst kopieret"));
  };

  const cancelEdit = () => {
    setContent(process?.content ?? "");
    setIsEditing(false);
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
          <p className="text-sm text-muted-foreground mt-1">{deptName} · Owner: {process.owner_name} · Opdateret {new Date(process.updated_at).toLocaleDateString("da-DK")}</p>
        </div>
        <div className="w-48"><QualityMeter score={process.quality_score} /></div>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Indhold</TabsTrigger>
          <TabsTrigger value="versions"><History className="mr-1 h-3 w-3" />Versioner ({versions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-3">
          <Card className="shadow-card"><CardContent className="pt-4 space-y-3">
            {!editable && (
              <p className="text-xs rounded bg-muted px-3 py-2 flex items-center gap-2">
                <Lock className="h-3 w-3" />Du har kun læseadgang.
              </p>
            )}
            {isEditing ? (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                className="font-mono text-xs"
                disabled={!editable}
              />
            ) : (
              <div ref={contentRef} className={proseClasses + " max-h-[600px] overflow-auto"}>
                {content.trim() ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Intet indhold endnu.</p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {editable && (
                  <>
                    <span className="text-sm">Status:</span>
                    <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                      <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {!isEditing && (
                  <>
                    <Button size="sm" variant="outline" onClick={copyMarkdown}>
                      <Copy className="mr-2 h-3 w-3" />Kopier markdown
                    </Button>
                    <Button size="sm" variant="outline" onClick={copyAsText}>
                      <FileText className="mr-2 h-3 w-3" />Kopier som tekst
                    </Button>
                    {editable && (
                      <Button size="sm" onClick={() => setIsEditing(true)}>
                        <Pencil className="mr-2 h-3 w-3" />Rediger
                      </Button>
                    )}
                  </>
                )}
                {isEditing && editable && (
                  <>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      <X className="mr-2 h-3 w-3" />Annullér
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                      <Eye className="mr-2 h-3 w-3" />Forhåndsvis
                    </Button>
                    <Button size="sm" onClick={save}>
                      <Save className="mr-2 h-3 w-3" />Gem ny version
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card className="shadow-card"><CardContent className="pt-4 divide-y">
            {versions.map((v, i) => (
              <div key={v.id} className="py-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">v{versions.length - i} {v.ai_generated && <span className="ml-1 text-xs text-accent">· AI</span>}</span>
                  <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString("da-DK")}</span>
                </div>
                <p className="text-xs text-muted-foreground">{v.created_by_name} — {v.notes}</p>
                <div className={proseClasses + " mt-2 max-h-[400px] overflow-auto"}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{v.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {versions.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Ingen versioner endnu.</p>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
