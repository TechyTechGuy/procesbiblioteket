import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Process } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AIMatch {
  id: string;
  reason: string;
}

interface AIResult {
  matches: AIMatch[];
  summary: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  allProcesses: Process[];
  onOpen: (p: Process) => void;
}

export function AISearchDialog({ open, onClose, allProcesses, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState("");

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    const processList = allProcesses
      .map((p) => `- ID:${p.id} | "${p.title}" | ${p.department_name} | ${p.status} | Tags: ${(p.tags ?? []).join(", ")}`)
      .join("\n");

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Du er en hjælpsom assistent der matcher arbejdsopgaver til relevante processer i et procesbibliotek.
Svar KUN med JSON i dette format (ingen markdown, ingen forklaring udenfor JSON):
{"matches":[{"id":"...","reason":"kort forklaring på dansk, maks 1 sætning"}],"summary":"1-2 sætninger om hvad du anbefalede og hvorfor"}
Find de 1-3 mest relevante processer baseret på opgavebeskrivelsen.`,
          messages: [
            {
              role: "user",
              content: `Procesbibliotek:\n${processList}\n\nOpgave: ${query}\n\nFind de mest relevante processer.`,
            },
          ],
        }),
      });

      const data = await resp.json();
      const text = data.content.map((i: { type: string; text?: string }) => i.text ?? "").join("");
      const parsed: AIResult = JSON.parse(text.replace(/```json|```/g, "").trim());
      setResult(parsed);
    } catch {
      setError("Noget gik galt. Tjek at du har en gyldig Anthropic API-nøgle.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setQuery("");
    setResult(null);
    setError("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Find den rigtige proces
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Beskriv hvad du skal lave – AI finder de mest relevante processer
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            placeholder="Fx: Jeg skal ansætte en ny medarbejder og sikre at alt er klar til første dag..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[90px] text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSearch();
            }}
          />
          <Button onClick={handleSearch} disabled={loading || !query.trim()} className="w-full">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyserer...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Find processer</>
            )}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
        )}

        {result && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3 leading-relaxed">
              {result.summary}
            </p>
            {result.matches.map((m) => {
              const p = allProcesses.find((x) => x.id === m.id);
              if (!p) return null;
              return (
                <button
                  key={m.id}
                  className="w-full text-left bg-card border rounded-lg p-3 hover:bg-secondary/50 transition-colors"
                  onClick={() => { handleClose(); onOpen(p); }}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium">{p.title}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{m.reason}</p>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
