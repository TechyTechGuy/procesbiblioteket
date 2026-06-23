import { useParams, useNavigate } from "react-router-dom";
import { useAuth, scoreQuality } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { QualityMeter } from "@/components/QualityMeter";
import { ArrowLeft, Lock, Save, History, Copy, FileText, Pencil, Eye, X, Wand2, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useRef } from "react";
import { Status, STATUSES } from "@/lib/types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PartyOverlay } from "@/components/PartyOverlay";
import { PartyPopper } from "lucide-react";

const proseClasses =
  "prose max-w-none dark:prose-invert leading-relaxed rounded-md border bg-background p-4 " +
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 " +
  "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 " +
  "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 " +
  "[&_p]:leading-relaxed " +
  "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3 " +
  "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left " +
  "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 " +
  "[&_tbody_tr:nth-child(even)]:bg-muted/30 " +
  "[&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded";

interface ProcessRow {
  id: string; title: string; content: string; status: Status; owner_name: string;
  department_id: string; tags: string[]; quality_score: number; updated_at: string;
  visible_to_all?: boolean; shared_department_ids?: string[];
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
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Status>("Draft");
  const [visibleToAll, setVisibleToAll] = useState(false);
  const [sharedDeptIds, setSharedDeptIds] = useState<string[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>("");
  const [partyOpen, setPartyOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data, error } = await supabase.from("processes").select("*").eq("id", id).maybeSingle();
    if (error || !data) { setNotFound(true); setLoading(false); return; }
    setProcess(data as ProcessRow);
    setContent(data.content); setStatus(data.status as Status); setTitle(data.title);
    setVisibleToAll(!!(data as any).visible_to_all);
    setSharedDeptIds(((data as any).shared_department_ids as string[]) ?? []);
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
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { toast.error("Titel må ikke være tom"); return; }
    const newScore = scoreQuality(content);
    const { error: upErr } = await supabase.from("processes").update({
      title: trimmedTitle, content, status, quality_score: newScore,
      visible_to_all: visibleToAll,
      shared_department_ids: visibleToAll ? [] : sharedDeptIds,
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
    setTitle(process?.title ?? "");
    setVisibleToAll(!!process?.visible_to_all);
    setSharedDeptIds(process?.shared_department_ids ?? []);
    setIsEditing(false);
  };

  const runAiCheck = async () => {
    if (!content.trim()) { toast.error("Intet indhold at tjekke"); return; }
    setAiLoading(true);
    setAiSuggestion("");
    try {
      const { data: rules } = await supabase
        .from("knowledge_items")
        .select("title, type, content, extracted_text")
        .eq("active", true).eq("use_in_ai", true);
      const rulesText = (rules ?? []).map((r: any) => {
        const extra = r.extracted_text ? `\n${r.extracted_text}` : "";
        return `### ${r.title} (${r.type})\n${r.content ?? ""}${extra}`;
      }).join("\n\n---\n\n");

      const { data, error } = await supabase.functions.invoke("claude-parse", {
        body: { kind: "improve", documentMarkdown: content, rules: rulesText, title: process.title },
      });
      if (error) {
        let msg = error.message ?? "ukendt fejl";
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const j = await ctx.json();
            if (j?.error) msg = typeof j.error === "string" ? j.error : JSON.stringify(j.error);
          }
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      setAiSuggestion((data as any)?.markdown ?? "");
      toast.success("AI-forslag klar");
    } catch (e: any) {
      toast.error("AI-tjek fejlede: " + (e?.message ?? ""));
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestion = () => {
    setContent(aiSuggestion);
    setIsEditing(true);
    setAiSuggestion("");
    toast.success("Forslag indsat — husk at gemme");
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/library")}><ArrowLeft className="mr-2 h-4 w-4" />Tilbage til bibliotek</Button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {isEditing && editable ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold h-auto py-1 px-2 max-w-xl"
              />
            ) : (
              <h1 className="text-2xl font-bold">{process.title}</h1>
            )}
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
                className="text-sm leading-relaxed p-3"
                disabled={!editable}
              />
            ) : (
              <div ref={contentRef} className={proseClasses}>
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
                    <Button size="sm" variant="outline" onClick={() => setPartyOpen(true)}>
                      <PartyPopper className="mr-2 h-3 w-3" />Fest!
                    </Button>
                    {editable && (
                      <>
                        <Button size="sm" variant="outline" onClick={runAiCheck} disabled={aiLoading}>
                          {aiLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Wand2 className="mr-2 h-3 w-3" />}
                          Kør AI-kvalitetstjek
                        </Button>
                        <Button size="sm" onClick={() => setIsEditing(true)}>
                          <Pencil className="mr-2 h-3 w-3" />Rediger
                        </Button>
                      </>
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

            {isEditing && editable && (
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="pd-all" checked={visibleToAll}
                    onCheckedChange={(v) => setVisibleToAll(!!v)} />
                  <label htmlFor="pd-all" className="text-sm cursor-pointer">
                    Synlig for hele organisationen
                  </label>
                </div>
                {!visibleToAll && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Del også med afdelinger (valgfri)</p>
                    <div className="grid grid-cols-2 gap-1">
                      {departments
                        .filter((d) => d.id !== process.department_id)
                        .map((d) => {
                          const checked = sharedDeptIds.includes(d.id);
                          return (
                            <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox checked={checked} onCheckedChange={(v) => {
                                setSharedDeptIds((prev) => v ? [...prev, d.id] : prev.filter(x => x !== d.id));
                              }} />
                              {d.name}
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent></Card>

          {aiSuggestion && (
            <Card className="shadow-card border-accent/40"><CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-accent" />AI-forslag
                </h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setAiSuggestion("")}>Forkast</Button>
                  <Button size="sm" onClick={applySuggestion}>Erstat indhold med forslag</Button>
                </div>
              </div>
              <div className={proseClasses}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiSuggestion}</ReactMarkdown>
              </div>
            </CardContent></Card>
          )}
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
                <div className={proseClasses + " mt-2"}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{v.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {versions.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Ingen versioner endnu.</p>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
      <PartyOverlay open={partyOpen} onClose={() => setPartyOpen(false)} />
    </div>
  );
}
