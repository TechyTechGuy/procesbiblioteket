## Problem

På `/process/:id` (efter "Gem i bibliotek") vises indholdet som rå markdown i en `Textarea` med monospace-font. Det er derfor det ser grimt ud — selvom AI'en producerer fin markdown med tabeller og overskrifter, bliver det vist som ren tekst, ikke som rendered output. Samme rendered preview som på Upload-siden mangler her.

## Løsning

Opdater `src/pages/ProcessDetail.tsx` så "Indhold"-fanen som default viser et **rendered markdown preview** (samme styling som på UploadImprove-siden), og kun skifter til en redigerbar markdown-editor når brugeren klikker "Rediger".

### Ændringer i `src/pages/ProcessDetail.tsx`

1. **Tilføj imports**: `ReactMarkdown`, `remark-gfm`, ikoner `Copy`, `FileText`, `Pencil`, `Eye`.
2. **Ny state**: `isEditing: boolean` (default `false`) og `contentRef` til "Kopier som tekst".
3. **View mode (default)** — i stedet for `Textarea`:
   - Render `<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>` i en `prose`-container med samme tabel/heading-styling som UploadImprove (border på `th`/`td`, baggrund på `th`, kompakte heading-størrelser).
   - Knapper: **Kopier markdown**, **Kopier som tekst** (via `ref.innerText`), og — hvis `editable` — **Rediger** der skifter til edit mode.
4. **Edit mode** — vises når `isEditing === true`:
   - Den eksisterende `Textarea` med `font-mono`.
   - Knapper: **Annullér** (resetter `content` til oprindelig værdi og slukker edit mode), **Forhåndsvis** (slukker edit mode uden at gemme).
   - Den eksisterende **Gem ny version**-knap gemmer og skifter tilbage til view mode.
5. **Status-dropdown** beholdes synlig i begge modes (admin/process owner skal kunne ændre status uden at gå i edit mode).
6. **Versioner-fanen**: tilføj samme rendered preview af `v.content` under hver version-header (i stedet for kun at vise metadata), så historikken også er læsbar.

### Tekniske detaljer

- Genbrug nøjagtigt samme Tailwind-klasser fra `UploadImprove.tsx` til `prose`-containeren for visuel konsistens.
- `Copy as text`-funktionen bruger `ref.current?.innerText` (fanger tabeller som tab-separeret tekst) med fallback til `content`.
- Ingen ændringer til database eller edge functions — dette er rent UI/presentation.
- `scoreQuality(content)` virker stadig på rå markdown — uændret.

### Filer der ændres

- `src/pages/ProcessDetail.tsx` (eneste fil)
