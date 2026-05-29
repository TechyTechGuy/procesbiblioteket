import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth, scoreQuality } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Loader2, Save } from "lucide-react";
import mammoth from "mammoth";
import TurndownService from "turndown";
import * as turndownGfm from "turndown-plugin-gfm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const htmlToMarkdown = (html: string) => {
  const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" });
  td.use((turndownGfm as any).gfm);
  return td.turndown(html);
};

export function QuickUploadDialog({ open, onOpenChange }: Props) {
  const { departments, profile, isAdmin, canEdit } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [visibleToAll, setVisibleToAll] = useState(false);
  const [sharedDeptIds, setSharedDeptIds] = useState<string[]>([]);

  useEffect(() => {
    if (!departmentId && profile?.department_id) setDepartmentId(profile.department_id);
  }, [profile?.department_id, departmentId]);

  const handleFile = async (f: File) => {
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    const name = f.name.toLowerCase();
    try {
      if (name.endsWith(".docx")) {
        const arrayBuffer = await f.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setContent(htmlToMarkdown(result.value));
        toast.success("Word-dokument indlæst");
      } else if (name.endsWith(".txt") || name.endsWith(".md")) {
        setContent(await f.text());
      } else {
        toast.error("Kun .docx og .txt understøttes her");
      }
    } catch (e: any) {
      toast.error("Kunne ikke læse fil: " + (e?.message ?? ""));
    }
  };

  const save = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Mangler titel eller indhold"); return;
    }
    const effectiveDeptId = isAdmin ? departmentId : (profile?.department_id ?? departmentId);
    if (!effectiveDeptId) { toast.error("Vælg en afdeling"); return; }
    if (!profile || !canEdit) { toast.error("Du har ikke rettigheder"); return; }

    setSaving(true);
    try {
      const { data: proc, error } = await supabase.from("processes").insert({
        title, content, department_id: effectiveDeptId, status: "Draft",
        owner_id: profile.id, owner_name: profile.full_name,
        tags: [(departments.find(d => d.id === effectiveDeptId)?.name ?? "").toLowerCase(), "ny"],
        quality_score: scoreQuality(content),
        visible_to_all: visibleToAll,
        shared_department_ids: visibleToAll ? [] : sharedDeptIds,
      }).select("id").single();
      if (error || !proc) { toast.error(error?.message ?? "Kunne ikke gemme"); return; }

      await supabase.from("process_versions").insert({
        process_id: proc.id, content,
        created_by_id: profile.id, created_by_name: profile.full_name,
        ai_generated: false, notes: "Første version (kladde)",
      });

      toast.success("Kladde gemt");
      onOpenChange(false);
      setTitle(""); setContent(""); setFile(null);
      setVisibleToAll(false); setSharedDeptIds([]);
      navigate(`/process/${proc.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload proces</DialogTitle>
          <DialogDescription>Gem som kladde med det samme — ingen AI-bearbejdning.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="qu-title">Titel</Label>
            <Input id="qu-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="F.eks. Onboarding ny medarbejder" />
          </div>
          <div>
            <Label>Afdeling</Label>
            <Select value={departmentId} onValueChange={setDepartmentId} disabled={!isAdmin}>
              <SelectTrigger><SelectValue placeholder={isAdmin ? "Vælg afdeling" : "Din afdeling"} /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {!isAdmin && <p className="text-[11px] text-muted-foreground mt-1">Gemmes i din afdeling.</p>}
          </div>
          <div>
            <Label htmlFor="qu-file" className="text-xs">Upload .docx eller .txt (valgfri)</Label>
            <Input id="qu-file" type="file" accept=".docx,.txt,.md"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {file && <p className="mt-1 text-xs text-success">Valgt: {file.name}</p>}
          </div>
          <div>
            <Label htmlFor="qu-content">…eller indsæt tekst</Label>
            <Textarea id="qu-content" value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Indsæt procestekst her..." rows={10} className="font-mono text-xs" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annullér</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Gem som kladde
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}