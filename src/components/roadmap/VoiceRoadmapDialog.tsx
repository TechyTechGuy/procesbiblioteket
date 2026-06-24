import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Mic, Square, Loader2, AlertCircle, Plus, Trash2, Check, ChevronsUpDown, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type State = "idle" | "recording" | "transcribing" | "structuring" | "draft" | "saving" | "error";
type ColumnType = "quarters" | "steps" | "months" | "custom";

interface DraftColumn { id: string; label: string }
interface DraftCard {
  id: string;
  column_id: string;
  title: string;
  status: string | null;
  description: string | null;
  process_id: string | null;
}
interface ProcessOpt { id: string; title: string }

const STATUS_OPTIONS = [
  { value: "completed", label: "Færdig" },
  { value: "in_progress", label: "I gang" },
  { value: "planned", label: "Planlagt" },
];

const pickMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
};

const fmt = (s: number) => {
  const m = Math.floor(s / 60); const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function VoiceRoadmapDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [transcript, setTranscript] = useState("");
  const [rawAi, setRawAi] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  // Draft
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [columnType, setColumnType] = useState<ColumnType>("custom");
  const [columns, setColumns] = useState<DraftColumn[]>([]);
  const [cards, setCards] = useState<DraftCard[]>([]);
  const [processes, setProcesses] = useState<ProcessOpt[]>([]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const reset = () => {
    setState("idle"); setErrorMsg(""); setTranscript(""); setRawAi(null); setSeconds(0);
    setName(""); setDescription(""); setColumnType("custom"); setColumns([]); setCards([]);
    chunksRef.current = [];
  };

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => {
    if (!open) {
      try { recorderRef.current?.state === "recording" && recorderRef.current.stop(); } catch { /* */ }
      cleanupStream();
      reset();
    } else {
      // Preload process list for combobox
      (async () => {
        const { data } = await supabase
          .from("processes").select("id, title").is("deleted_at", null).order("title");
        setProcesses((data as ProcessOpt[]) ?? []);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const start = async () => {
    reset();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      if (!mimeType) {
        setState("error"); setErrorMsg("Din browser understøtter ikke lydoptagelse i et kompatibelt format.");
        cleanupStream(); return;
      }
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        cleanupStream();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size < 1024) {
          setState("error"); setErrorMsg("Optagelsen var tom — prøv igen og tal tydeligt.");
          return;
        }
        await processAudio(blob);
      };
      recorder.start();
      setState("recording");
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e: any) {
      setState("error"); setErrorMsg("Mikrofonen kunne ikke startes: " + (e?.message ?? "ukendt fejl"));
      cleanupStream();
    }
  };

  const stop = () => { try { recorderRef.current?.stop(); } catch { /* */ } };

  const extractErr = async (err: any) => {
    const ctx = err?.context;
    let msg = err?.message ?? "Fejl";
    try {
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) msg = body.error;
      } else if (ctx && typeof ctx.text === "function") {
        const t = await ctx.text();
        if (t) msg = t;
      }
    } catch { /* */ }
    return msg;
  };

  const processAudio = async (blob: Blob) => {
    setState("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, `recording.${blob.type.includes("mp4") ? "mp4" : "webm"}`);
      const { data, error } = await supabase.functions.invoke("voice-transcribe", { body: form });
      if (error) throw new Error(await extractErr(error));
      if ((data as any)?.error) throw new Error((data as any).error);
      const text = (data as any)?.text ?? "";
      setTranscript(text);
      if (!text.trim()) {
        setState("error"); setErrorMsg("Ingen tekst genkendt. Prøv igen og tal tydeligt."); return;
      }

      setState("structuring");
      const { data: sData, error: sErr } = await supabase.functions.invoke("voice-structure-roadmap", {
        body: { transcript: text },
      });
      if (sErr) throw new Error(await extractErr(sErr));
      const sd = sData as any;
      if (sd?.error) {
        setRawAi(sd.raw ?? null);
        throw new Error(sd.error);
      }

      // Apply to draft state
      const cols: DraftColumn[] = Array.isArray(sd.columns)
        ? sd.columns.map((c: any) => ({ id: crypto.randomUUID(), label: c.label }))
        : [];
      const labelToId = new Map(cols.map((c) => [c.label, c.id]));
      const cs: DraftCard[] = Array.isArray(sd.cards)
        ? sd.cards.map((c: any) => ({
            id: crypto.randomUUID(),
            column_id: labelToId.get(c.column_label) ?? cols[0]?.id ?? "",
            title: c.title ?? "",
            status: c.status ?? null,
            description: c.description ?? null,
            process_id: c.process_match ?? null,
          })).filter((c: DraftCard) => c.column_id)
        : [];

      setName(sd.name ?? "Nyt roadmap");
      setDescription(sd.description ?? "");
      setColumnType((sd.column_type as ColumnType) ?? "custom");
      setColumns(cols);
      setCards(cs);
      setState("draft");
    } catch (e: any) {
      setState("error"); setErrorMsg(e?.message ?? "Ukendt fejl");
      toast.error(e?.message ?? "Noget gik galt");
    }
  };

  // --- Draft editing helpers ---
  const addColumn = () => {
    setColumns((cs) => [...cs, { id: crypto.randomUUID(), label: `Kolonne ${cs.length + 1}` }]);
  };
  const renameColumn = (id: string, label: string) =>
    setColumns((cs) => cs.map((c) => c.id === id ? { ...c, label } : c));
  const deleteColumn = (id: string) => {
    setColumns((cs) => cs.filter((c) => c.id !== id));
    setCards((cs) => cs.filter((c) => c.column_id !== id));
  };

  const addCard = () => {
    if (!columns.length) { toast.error("Tilføj en kolonne først"); return; }
    setCards((cs) => [...cs, {
      id: crypto.randomUUID(), column_id: columns[0].id, title: "Nyt kort",
      status: null, description: null, process_id: null,
    }]);
  };
  const updateCard = (id: string, patch: Partial<DraftCard>) =>
    setCards((cs) => cs.map((c) => c.id === id ? { ...c, ...patch } : c));
  const deleteCard = (id: string) => setCards((cs) => cs.filter((c) => c.id !== id));

  const create = async () => {
    if (!name.trim()) { toast.error("Navn er påkrævet"); return; }
    if (!columns.length) { toast.error("Tilføj mindst én kolonne"); return; }
    setState("saving");
    try {
      const { data: u } = await supabase.auth.getUser();
      const colsForDb = columns.map((c, i) => ({ id: c.id, label: c.label, order: i }));
      const { data: rm, error: rmErr } = await supabase
        .from("roadmaps")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          column_type: columnType,
          columns: colsForDb as any,
          created_by: u.user?.id ?? null,
        })
        .select("id")
        .single();
      if (rmErr || !rm) throw new Error(rmErr?.message ?? "Kunne ikke oprette roadmap");

      if (cards.length) {
        // Compute per-column order
        const orderByCol = new Map<string, number>();
        const rows = cards.map((c) => {
          const order = orderByCol.get(c.column_id) ?? 0;
          orderByCol.set(c.column_id, order + 1);
          return {
            roadmap_id: rm.id,
            column_id: c.column_id,
            order,
            title: c.title || "Uden titel",
            status: c.status,
            description: c.description,
            process_id: c.process_id,
          };
        });
        const { error: cErr } = await supabase.from("roadmap_cards").insert(rows);
        if (cErr) throw new Error(cErr.message);
      }

      toast.success("Roadmap oprettet");
      onOpenChange(false);
      navigate(`/roadmaps/${rm.id}`);
    } catch (e: any) {
      setState("draft");
      toast.error(e?.message ?? "Kunne ikke gemme");
    }
  };

  // --- UI ---
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Diktér roadmap</DialogTitle>
          <DialogDescription>
            Beskriv dit roadmap mundtligt på dansk. Vi transskriberer, foreslår en struktur — og du retter til før det gemmes.
          </DialogDescription>
        </DialogHeader>

        {state !== "draft" && state !== "saving" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              {state === "recording" ? (
                <Button size="lg" variant="destructive" onClick={stop} className="h-20 w-20 rounded-full">
                  <Square className="h-7 w-7" />
                </Button>
              ) : (
                <Button
                  size="lg" onClick={start}
                  disabled={state === "transcribing" || state === "structuring"}
                  className="h-20 w-20 rounded-full"
                >
                  {state === "transcribing" || state === "structuring"
                    ? <Loader2 className="h-7 w-7 animate-spin" />
                    : <Mic className="h-7 w-7" />}
                </Button>
              )}
              <div className="text-sm text-muted-foreground min-h-5">
                {state === "idle" && "Klik for at starte optagelse"}
                {state === "recording" && (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-destructive animate-pulse" />
                    Optager… {fmt(seconds)}
                  </span>
                )}
                {state === "transcribing" && "Transskriberer lyden…"}
                {state === "structuring" && "Strukturerer roadmap…"}
                {state === "error" && (
                  <span className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" /> Fejl
                  </span>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            {rawAi && (
              <div>
                <p className="text-xs font-medium mb-1">AI-svar (rå)</p>
                <div className="rounded-md border bg-muted/30 p-3 text-xs max-h-40 overflow-auto whitespace-pre-wrap">
                  {rawAi}
                </div>
              </div>
            )}

            {transcript && (
              <div>
                <p className="text-xs font-medium mb-1">Transskription</p>
                <div className="rounded-md border bg-muted/30 p-3 text-xs max-h-32 overflow-auto whitespace-pre-wrap">
                  {transcript}
                </div>
              </div>
            )}
          </div>
        )}

        {(state === "draft" || state === "saving") && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Navn</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Kolonnetype</Label>
                <Select value={columnType} onValueChange={(v) => setColumnType(v as ColumnType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarters">Kvartaler</SelectItem>
                    <SelectItem value="steps">Steps</SelectItem>
                    <SelectItem value="months">Måneder</SelectItem>
                    <SelectItem value="custom">Brugerdefineret</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Beskrivelse</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Kolonner</Label>
                <Button variant="ghost" size="sm" onClick={addColumn}>
                  <Plus className="mr-1 h-4 w-4" /> Tilføj kolonne
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {columns.map((c) => (
                  <div key={c.id} className="flex items-center gap-1 rounded-md border bg-muted/30 pl-2 pr-1 py-1">
                    <Input
                      value={c.label}
                      onChange={(e) => renameColumn(c.id, e.target.value)}
                      className="h-7 w-36 border-0 bg-transparent px-1 focus-visible:ring-0"
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteColumn(c.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                {columns.length === 0 && (
                  <p className="text-xs text-muted-foreground">Ingen kolonner. Tilføj én for at komme i gang.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Kort ({cards.length})</Label>
                <Button variant="ghost" size="sm" onClick={addCard}>
                  <Plus className="mr-1 h-4 w-4" /> Tilføj kort
                </Button>
              </div>
              <div className="space-y-3">
                {cards.map((card) => (
                  <CardEditor
                    key={card.id}
                    card={card}
                    columns={columns}
                    processes={processes}
                    onChange={(p) => updateCard(card.id, p)}
                    onDelete={() => deleteCard(card.id)}
                  />
                ))}
                {cards.length === 0 && (
                  <p className="text-xs text-muted-foreground">Ingen kort endnu.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annullér</Button>
          {state === "error" && <Button variant="outline" onClick={reset}>Prøv igen</Button>}
          {state === "draft" && (
            <Button onClick={create}>Opret roadmap</Button>
          )}
          {state === "saving" && (
            <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gemmer…</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CardEditor({
  card, columns, processes, onChange, onDelete,
}: {
  card: DraftCard;
  columns: DraftColumn[];
  processes: ProcessOpt[];
  onChange: (patch: Partial<DraftCard>) => void;
  onDelete: () => void;
}) {
  const [comboOpen, setComboOpen] = useState(false);
  const selected = processes.find((p) => p.id === card.process_id);

  return (
    <div className="rounded-md border bg-card p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Input
          value={card.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Korttitel"
          className="font-medium"
        />
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <Textarea
        value={card.description ?? ""}
        onChange={(e) => onChange({ description: e.target.value || null })}
        placeholder="Beskrivelse (valgfri)"
        rows={2}
        className="text-sm"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Kolonne</Label>
          <Select value={card.column_id} onValueChange={(v) => onChange({ column_id: v })}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {columns.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Input
            list={`status-sugg-${card.id}`}
            value={card.status ?? ""}
            onChange={(e) => onChange({ status: e.target.value || null })}
            placeholder="completed / in_progress / planned"
            className="h-8"
          />
          <datalist id={`status-sugg-${card.id}`}>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </datalist>
        </div>
      </div>
      <div>
        <Label className="text-xs">Linket proces</Label>
        {card.process_id && selected ? (
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5">
            <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-sm truncate flex-1">{selected.title}</span>
            <Button variant="ghost" size="sm" className="h-7" onClick={() => onChange({ process_id: null })}>
              Fjern link
            </Button>
          </div>
        ) : (
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" size="sm" className="w-full justify-between font-normal h-8">
                {card.process_id && !selected ? "Foreslået proces ikke fundet" : "Link til eksisterende proces…"}
                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Søg…" />
                <CommandList>
                  <CommandEmpty>Ingen processer fundet.</CommandEmpty>
                  <CommandGroup>
                    {processes.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.title}
                        onSelect={() => { onChange({ process_id: p.id }); setComboOpen(false); }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", card.process_id === p.id ? "opacity-100" : "opacity-0")} />
                        {p.title}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}