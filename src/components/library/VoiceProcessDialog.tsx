import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VoiceProcessResult {
  procesnavn: string;
  afdeling: string;
  ansvarlig: string;
  beskrivelse: string;
  trin: string[];
}

type State = "idle" | "recording" | "transcribing" | "structuring" | "done" | "error";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseAsDraft: (result: VoiceProcessResult, transcript: string) => void;
}

const pickMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
};

const fmt = (s: number) => {
  const m = Math.floor(s / 60); const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
};

export function VoiceProcessDialog({ open, onOpenChange, onUseAsDraft }: Props) {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<VoiceProcessResult | null>(null);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const reset = () => {
    setState("idle"); setErrorMsg(""); setTranscript(""); setResult(null); setSeconds(0);
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
    }
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

  const stop = () => {
    try { recorderRef.current?.stop(); } catch { /* */ }
  };

  const processAudio = async (blob: Blob) => {
    setState("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, `recording.${blob.type.includes("mp4") ? "mp4" : "webm"}`);
      const { data, error } = await supabase.functions.invoke("voice-transcribe", { body: form });
      if (error) {
        const ctx = (error as any).context;
        let msg = error.message ?? "Transskription fejlede";
        try {
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          } else if (ctx && typeof ctx.text === "function") {
            const t = await ctx.text();
            if (t) msg = t;
          }
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      const text = (data as any)?.text ?? "";
      setTranscript(text);
      if (!text.trim()) {
        setState("error"); setErrorMsg("Ingen tekst genkendt. Prøv igen og tal tydeligt.");
        return;
      }

      setState("structuring");
      const { data: sData, error: sErr } = await supabase.functions.invoke("voice-structure-process", {
        body: { transcript: text },
      });
      if (sErr) {
        const ctx = (sErr as any).context;
        let msg = sErr.message ?? "Strukturering fejlede";
        try {
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          } else if (ctx && typeof ctx.text === "function") {
            const t = await ctx.text();
            if (t) msg = t;
          }
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      if ((sData as any)?.error) throw new Error((sData as any).error);
      setResult(sData as VoiceProcessResult);
      setState("done");
    } catch (e: any) {
      setState("error"); setErrorMsg(e?.message ?? "Ukendt fejl");
      toast.error(e?.message ?? "Noget gik galt");
    }
  };

  const useAsDraft = () => {
    if (result) onUseAsDraft(result, transcript);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Indtal proces</DialogTitle>
          <DialogDescription>
            Beskriv processen mundtligt på dansk. Vi transskriberer og foreslår en struktur — du retter til bagefter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mic control */}
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
              {state === "structuring" && "Strukturerer indholdet…"}
              {state === "done" && "Klar — gennemgå nedenfor og brug som udkast"}
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

          {transcript && (
            <div>
              <p className="text-xs font-medium mb-1">Transskription</p>
              <div className="rounded-md border bg-muted/30 p-3 text-xs max-h-32 overflow-auto whitespace-pre-wrap">
                {transcript}
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-md border p-3 space-y-1 text-xs">
              <p><span className="font-medium">Procesnavn:</span> {result.procesnavn || <em className="text-muted-foreground">(tom)</em>}</p>
              <p><span className="font-medium">Afdeling:</span> {result.afdeling || <em className="text-muted-foreground">(ikke fundet)</em>}</p>
              <p><span className="font-medium">Ansvarlig:</span> {result.ansvarlig || <em className="text-muted-foreground">(tom)</em>}</p>
              <p><span className="font-medium">Trin:</span> {result.trin.length}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annullér</Button>
          {state === "error" && <Button variant="outline" onClick={reset}>Prøv igen</Button>}
          <Button onClick={useAsDraft} disabled={state !== "done"}>
            Brug som udkast
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}