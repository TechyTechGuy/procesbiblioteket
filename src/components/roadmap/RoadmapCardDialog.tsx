import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface CardDraft {
  id?: string;
  title: string;
  status: string | null;
  description: string | null;
  process_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CardDraft | null;
  onSave: (draft: CardDraft) => Promise<void> | void;
}

interface ProcessOpt { id: string; title: string }

const STATUS_OPTIONS = [
  { value: "completed", label: "Færdig" },
  { value: "in_progress", label: "I gang" },
  { value: "planned", label: "Planlagt" },
];

export function RoadmapCardDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [mode, setMode] = useState<"process" | "free">(initial?.process_id ? "process" : "free");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [status, setStatus] = useState(initial?.status ?? "planned");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [processId, setProcessId] = useState<string | null>(initial?.process_id ?? null);
  const [processes, setProcesses] = useState<ProcessOpt[]>([]);
  const [comboOpen, setComboOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(initial?.process_id ? "process" : "free");
    setTitle(initial?.title ?? "");
    setStatus(initial?.status ?? "planned");
    setDescription(initial?.description ?? "");
    setProcessId(initial?.process_id ?? null);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("processes")
        .select("id, title")
        .is("deleted_at", null)
        .order("title");
      setProcesses((data as ProcessOpt[]) ?? []);
    })();
  }, [open]);

  const submit = async () => {
    if (!title.trim()) { toast.error("Titel er påkrævet"); return; }
    setSaving(true);
    try {
      await onSave({
        id: initial?.id,
        title: title.trim(),
        status: status || null,
        description: description.trim() || null,
        process_id: mode === "process" ? processId : null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const selectedProcess = processes.find((p) => p.id === processId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Rediger kort" : "Nyt kort"}</DialogTitle>
        </DialogHeader>
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="process">Link til proces</TabsTrigger>
            <TabsTrigger value="free">Frit kort</TabsTrigger>
          </TabsList>
          <TabsContent value="process" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Proces</Label>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {selectedProcess?.title ?? "Vælg en proces…"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Søg efter proces…" />
                    <CommandList>
                      <CommandEmpty>Ingen processer fundet.</CommandEmpty>
                      <CommandGroup>
                        {processes.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.title}
                            onSelect={() => {
                              setProcessId(p.id);
                              if (!title.trim()) setTitle(p.title);
                              setComboOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", processId === p.id ? "opacity-100" : "opacity-0")} />
                            {p.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </TabsContent>
          <TabsContent value="free" className="pt-4" />
        </Tabs>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titel</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kortets titel" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Input
              list="roadmap-status-suggestions"
              value={status ?? ""}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="completed / in_progress / planned eller egen"
            />
            <datalist id="roadmap-status-suggestions">
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label>Beskrivelse</Label>
            <Textarea value={description ?? ""} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annullér</Button>
          <Button onClick={submit} disabled={saving}>Gem</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}