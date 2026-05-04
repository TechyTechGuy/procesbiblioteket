## Mål

1. Erstat det forvirrende dobbelt-layout (rendered + rå tekst) med ét rendered output-panel.
2. Lad Claude parse OG forbedre dokumentet i ét kald, hvor vidensbankens regler injiceres direkte i system prompten.

---

## Issue 1 — Ét rendered output-panel

Rediger `src/pages/UploadImprove.tsx`:

- Fjern den nederste `<Textarea>` der viser rå markdown for `improved`.
- Behold det øverste rendered preview-panel (ReactMarkdown + remark-gfm). Brug samme styling som Claude-preview-blokken (tabel/border/heading klasser) så rendered "improved" matcher præcist.
- `improved` markdown gemmes i state men vises ikke længere som råtekst (det er det "skjulte" felt der submittes ved Gem).
- Knapper under det rendered output:
  - **Kopier markdown** — kopierer rå `improved` markdown (uændret).
  - **Kopier som tekst** — render markdown til pænt formateret plain text (tabeller bevaret som tekst-tabeller). Brug en let helper:
    - Konverter `improved` (markdown) → HTML via `marked` eller en mini-renderer; eller endnu enklere: render til en skjult DOM-node via `ReactMarkdown` og brug `node.innerText` (bevarer tabel-radbrydning naturligt).
    - Foretrukket: skjult `<div ref>` der allerede indeholder det rendered preview → `ref.current.innerText` på klik. Ingen ny dependency.
  - **Gem i bibliotek** — uændret, bruger `improved` state direkte (det "skjulte rå markdown felt").
- Tilsvarende oprydning i Claude-preview-blokken: behold "Brug som udkast" (sætter `draft` = rå markdown bagved) og "Kopier markdown".
- Ingen synlig rå-tekst editor for `improved`. Hvis brugeren vil rette: de redigerer `draft` (input) og kører Forbedr igen.

---

## Issue 2 — Vidensbank ind i Claude-kaldet

Ny flow når brugeren klikker **Forbedr forslag**:

1. Hent aktive knowledge_items hvor `use_in_ai = true` OG (`scope = 'global'` ELLER `department_id = bruger.department_id`).
   - For hver item byg en tekstblok: `### {title} ({type})\n{content}\n{extracted_text ?? ""}`.
2. Send ALT i ét kald til `claude-parse` edge function med en ny `kind: "improve"` payload:
   ```json
   { "kind": "improve",
     "documentMarkdown": "<draft eller claudeOutput>",
     "rules": "<sammenflettet regeltekst>",
     "title": "<title>" }
   ```
3. Edge function `supabase/functions/claude-parse/index.ts` udvides med håndtering af `kind: "improve"`:
   - System prompt:
     ```
     You are a document parser and process improver.

     KNOWLEDGE BASE RULES:
     {rules}

     Task: Parse the uploaded document AND apply the above rules to suggest improvements.
     Present the result in two clearly labeled sections:
     1. **Parsed document** — structured extraction with tables preserved as markdown tables
     2. **Suggested improvements** — based on the knowledge base rules

     Respond in Danish. Return only markdown, no preamble.
     ```
   - User content: dokumentets markdown (`documentMarkdown`).
   - Samme model (`claude-sonnet-4-5`), max_tokens hævet til 12000.
4. Frontend: `improve()` bliver async, kalder edge function, sætter `improved = data.markdown`, viser rendered preview. Den eksisterende lokale "findings" section (Opfyldte/Mangler) fjernes — Claude leverer nu forbedringerne i sektion 2.

### Edge case håndtering
- Hvis ingen aktive AI-regler: send `rules = "(ingen regler defineret)"` og lad Claude bare parse + give generelle forslag.
- Hvis `draft` er tomt men `claudeOutput` findes: brug `claudeOutput` som documentMarkdown.
- Loading state på "Forbedr forslag" knappen (spinner + disabled).
- Fejl vises via toast som i parseWithClaude.

---

## Berørte filer

- `src/pages/UploadImprove.tsx` — UI omskrivning + ny `improve()` der kalder edge function med regler.
- `supabase/functions/claude-parse/index.ts` — tilføj `kind: "improve"` branch med rules-injiceret system prompt.
- Ingen DB-ændringer. Ingen nye dependencies.
