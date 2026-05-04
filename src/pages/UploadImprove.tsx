import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, scoreQuality } from "@/lib/auth";
import { Wand2, Save, FileUp, Sparkles, Loader2, Bot, Copy, FileText } from "lucide-react";
import { QualityMeter } from "@/components/QualityMeter";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import mammoth from "mammoth";
import TurndownService from "turndown";
import * as turndownGfm from "turndown-plugin-gfm";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function UploadImprove() {
  const { departments, profile, canEdit, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [improved, setImproved] = useState("");
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedImages, setExtractedImages] = useState<{ name: string; dataUrl: string }[]>([]);
  const [claudeOutput, setClaudeOutput] = useState<string>("");
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [improveLoading, setImproveLoading] = useState(false);
  const improvedRef = useRef<HTMLDivElement | null>(null);

  // Shared HTML -> Markdown converter (preserves tables, headings, images)
  const htmlToMarkdown = (html: string) => {
    const td = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });
    td.use((turndownGfm as any).gfm);
    return td.turndown(html);
  };

  const looksLikeHtml = (s: string) => /<\/?(table|tr|td|th|tbody|thead|p|div|span|h[1-6]|ul|ol|li|img|br)\b/i.test(s);

  const fileToBase64 = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result ?? "");
        const i = s.indexOf(",");
        resolve(i >= 0 ? s.slice(i + 1) : s);
      };
      r.onerror = () => reject(r.error);
      r.readAsDataURL(f);
    });

  const parseWithClaude = async (f: File) => {
    const name = f.name.toLowerCase();
    const isImage = /\.(png|jpe?g)$/i.test(name) || f.type.startsWith("image/");
    const isDocx = name.endsWith(".docx");
    if (!isImage && !isDocx) return;

    setClaudeLoading(true);
    setClaudeOutput("");
    try {
      let payload: any;
      if (isImage) {
        const base64 = await fileToBase64(f);
        const mediaType = f.type || (name.endsWith(".png") ? "image/png" : "image/jpeg");
        payload = { kind: "image", image: { mediaType, base64 } };
      } else {
        const arrayBuffer = await f.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        payload = { kind: "docx", text: result.value };
      }
      const { data, error } = await supabase.functions.invoke("claude-parse", { body: payload });
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
      const md = (data as any)?.markdown ?? "";
      setClaudeOutput(md);
      if (!draft.trim()) setDraft(md);
      toast.success("Claude har parset dokumentet");
    } catch (e: any) {
      toast.error("Claude-parsing fejlede: " + (e?.message ?? "ukendt fejl"));
    } finally {
      setClaudeLoading(false);
    }
  };

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
      const isImage = /\.(png|jpe?g)$/i.test(name) || f.type.startsWith("image/");
      if (isImage) {
        // Images: don't set local draft, send straight to Claude
        setExtractedImages([]);
        await parseWithClaude(f);
        return;
      }
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
        const markdown = htmlToMarkdown(result.value);
        setDraft(markdown);
        setExtractedImages(images);
        if (images.length > 0) {
          toast.success(`Word-dokument indlæst (${images.length} billede(r) fundet)`);
        } else {
          toast.success("Word-dokument indlæst");
        }
        // Also send to Claude for richer structured parsing
        parseWithClaude(f);
      } else if (name.endsWith(".doc")) {
        toast.error("Gamle .doc-filer understøttes ikke. Gem som .docx.");
      } else if (name.endsWith(".html") || name.endsWith(".htm")) {
        const text = await f.text();
        setDraft(htmlToMarkdown(text));
        setExtractedImages([]);
        toast.success("HTML-dokument konverteret til markdown");
      } else {
        const text = await f.text();
        // If a .txt/.md happens to contain HTML markup (e.g. pasted from Word/web), convert it
        setDraft(looksLikeHtml(text) ? htmlToMarkdown(text) : text);
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
    if (f) { handleFile(f); return; }
    // Support dragging selected HTML/text from a browser or Word web
    const html = e.dataTransfer.getData("text/html");
    const plain = e.dataTransfer.getData("text/plain");
    if (html) {
      setDraft(htmlToMarkdown(html));
      toast.success("HTML indsat og konverteret til markdown");
    } else if (plain) {
      setDraft(looksLikeHtml(plain) ? htmlToMarkdown(plain) : plain);
    }
  }, []);

  const onPasteDraft = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData("text/html");
    if (html && looksLikeHtml(html)) {
      e.preventDefault();
      const md = htmlToMarkdown(html);
      // Insert at cursor position
      const ta = e.currentTarget;
      const start = ta.selectionStart ?? draft.length;
      const end = ta.selectionEnd ?? draft.length;
      const next = draft.slice(0, start) + md + draft.slice(end);
      setDraft(next);
      toast.success("HTML konverteret til markdown ved indsætning");
    }
  };

  const improve = () => {
  };

  const improveWithClaude = async () => {
    const sourceDoc = (draft && draft.trim()) || claudeOutput;
    if (!sourceDoc.trim()) { toast.error("Tilføj først et udkast eller upload et dokument"); return; }

    setImproveLoading(true);
    try {
      // Hent aktive AI-regler tilgængelige for brugeren (RLS filtrerer scope/department)
      const { data: rules, error: rulesErr } = await supabase
        .from("knowledge_items")
        .select("title, type, content, extracted_text")
        .eq("active", true)
        .eq("use_in_ai", true);
      if (rulesErr) throw rulesErr;

      const rulesText = (rules ?? [])
        .map((r: any) => {
          const extra = r.extracted_text ? `\n${r.extracted_text}` : "";
          return `### ${r.title} (${r.type})\n${r.content ?? ""}${extra}`;
        })
        .join("\n\n---\n\n");

      const { data, error } = await supabase.functions.invoke("claude-parse", {
        body: { kind: "improve", documentMarkdown: sourceDoc, rules: rulesText, title },
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
      const md = (data as any)?.markdown ?? "";
      setImproved(md);
      toast.success("Forslag genereret");
    } catch (e: any) {
      toast.error("Forbedring fejlede: " + (e?.message ?? "ukendt fejl"));
    } finally {
      setImproveLoading(false);
    }
  };

  const copyMarkdown = () => {
    navigator.clipboard.writeText(improved).then(() => toast.success("Markdown kopieret"));
  };

  const copyAsText = () => {
    const el = improvedRef.current;
    const text = el ? (el.innerText || el.textContent || improved) : improved;
    navigator.clipboard.writeText(text).then(() => toast.success("Tekst kopieret"));
  };

  const save = async () => {
    if (!title.trim() || !improved) { toast.error("Mangler titel eller indhold"); return; }
    // For non-admins, force their own department
    const effectiveDeptId = isAdmin ? departmentId : (profile?.department_id ?? departmentId);
    if (!effectiveDeptId) { toast.error("Vælg en afdeling"); return; }
    if (!profile) return;
    if (!canEdit) { toast.error("Du har ikke rettigheder til at oprette processer"); return; }

    let filePath: string | null = null;
    if (file) {
      const path = `${profile.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file);
      if (upErr) { toast.error("Filupload fejlede: " + upErr.message); return; }
      filePath = path;
      await supabase.from("uploads").insert({
        file_path: path, original_text: draft, title, department_id: effectiveDeptId, created_by: profile.id,
      });
    } else if (draft) {
      await supabase.from("uploads").insert({
        file_path: null, original_text: draft, title, department_id: effectiveDeptId, created_by: profile.id,
      });
    }

    const { data: proc, error: procErr } = await supabase.from("processes").insert({
      title, content: improved, department_id: effectiveDeptId, status: "Draft",
      owner_id: profile.id, owner_name: profile.full_name,
      tags: [(departments.find(d => d.id === effectiveDeptId)?.name ?? "").toLowerCase(), "ny"],
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
                <Select value={departmentId} onValueChange={setDepartmentId} disabled={!isAdmin}>
                  <SelectTrigger>
                    <SelectValue placeholder={isAdmin ? "Vælg hvor processen skal gemmes" : "Din afdeling"} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!isAdmin && (
                  <p className="text-[11px] text-muted-foreground mt-1">Gemmes automatisk i din afdeling.</p>
                )}
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
                  accept=".txt,.md,.docx,.html,.htm,.png,.jpg,.jpeg,image/png,image/jpeg"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <p className="mt-2 text-muted-foreground">
                  Træk og slip .docx, .png, .jpg, .html, .txt eller .md filer her. Word og billeder parses automatisk af Claude.
                </p>
                {file && (
                  <p className="mt-1 text-success">Valgt: {file.name}</p>
                )}
              </div>
            </div>
            {(claudeLoading || claudeOutput) && (
              <Card className="border-accent/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="h-4 w-4 text-accent" />
                    Claude parsing (claude-sonnet-4)
                  </CardTitle>
                  <CardDescription className="text-xs">Struktureret udtræk med tabeller og fremhævninger</CardDescription>
                </CardHeader>
                <CardContent>
                  {claudeLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Claude læser dokumentet…
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="prose prose-sm max-w-none dark:prose-invert rounded-md border bg-background p-3 max-h-[400px] overflow-auto
                        [&_table]:w-full [&_table]:border-collapse [&_table]:my-2
                        [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left
                        [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1
                        [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-semibold [&_h3]:font-semibold
                        [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{claudeOutput}</ReactMarkdown>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDraft(claudeOutput)}>
                          Brug som udkast
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(claudeOutput).then(() => toast.success("Kopieret"))}>
                          Kopier markdown
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} onPaste={onPasteDraft} placeholder="Indsæt dit procesudkast her (HTML fra Word/web konverteres automatisk)..." rows={12} className="font-mono text-xs" />
            <Button onClick={improveWithClaude} disabled={improveLoading} className="w-full bg-gradient-primary hover:opacity-90 transition-smooth">
              {improveLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Forbedr forslag
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" />Forbedret forslag</CardTitle>
            <CardDescription>Baseret på {knowledgeCount} aktive regler i vidensbanken</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {improveLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Claude analyserer dokumentet og anvender regler…
              </div>
            ) : improved ? (
              <>
                <QualityMeter score={scoreQuality(improved)} />
                <div
                  ref={improvedRef}
                  className="prose prose-sm max-w-none dark:prose-invert rounded-md border bg-background p-3 max-h-[600px] overflow-auto
                    [&_table]:w-full [&_table]:border-collapse [&_table]:my-2
                    [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left
                    [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1
                    [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-semibold [&_h3]:font-semibold
                    [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{improved}</ReactMarkdown>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={copyMarkdown}>
                    <Copy className="mr-2 h-3 w-3" />Kopier markdown
                  </Button>
                  <Button size="sm" variant="outline" onClick={copyAsText}>
                    <FileText className="mr-2 h-3 w-3" />Kopier som tekst
                  </Button>
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
