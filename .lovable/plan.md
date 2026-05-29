## Mål
Forenkle navigationen til ét hovedside (Procesbibliotek), fjerne Dashboard, og lægge favoritter, stats, view-toggle og en hurtig "Upload proces"-dialog ind på Library. AI-kvalitetstjek flyttes til ProcessDetail som en valgfri knap.

## Ændringer

### 1. Navigation (`src/components/layout/AppSidebar.tsx`)
- Fjern Dashboard og Upload & Forbedr fra `items`.
- Behold Procesbibliotek (`/library`) og Vidensbank (`/knowledge`).
- Behold admin-sektion (Brugere & adgang).

### 2. Routing (`src/App.tsx`)
- Fjern import af `Index`.
- Sæt `/` til at vise Library (redirect eller direkte render).
- Behold `/upload`-route som peger på `UploadImprove` (stadig tilgængelig direkte).
- Behold `/process/:id`, `/knowledge`, `/admin`.

### 3. Slet filer
- `src/pages/Dashboard.tsx`
- `src/pages/Index.tsx` (eller ret til at re-eksportere Library)

### 4. `src/pages/Library.tsx` (hovedrefaktor)
Tilføj øverst:
- **Stats-bar** med 4 kort (genbrug `DashboardStats`-mønster, men kald direkte i Library): totalt antal, gns. quality_score, kræver opmærksomhed (status `In Review` eller `quality_score < 50`), publicerede.
- **View-toggle (grid/list)** øverst til højre ved siden af ny "Upload proces"-knap.
- **"Upload proces"-knap** der åbner en ny dialog-komponent.

Favoritter:
- localStorage-nøgle `library_favs` (string[] af process-ids).
- Lille stjerne-ikon på hvert kort/række (Lucide `Star`) der toggler favorit.
- Sortering: favoritter først, derefter eksisterende rækkefølge (updated_at desc).

List-visning:
- Når `view === "list"`: render som kompakt tabel/rækker i stedet for kort-grid (titel, afdeling, status, owner, kvalitet, stjerne, slet-knap).

Behold:
- Søgning, afdelings-filter, status-filter.
- Soft delete / restore / permanent delete-logik.
- Papirkurv-toggle.

### 5. Ny komponent `src/components/library/QuickUploadDialog.tsx`
Dialog med:
- Titel-input.
- Afdeling-select (admin ser alle, andre låst til egen afdeling — som i `UploadImprove`).
- Fil-upload (`.docx` eller `.txt`) ELLER textarea til indsat tekst.
- `.docx` parses lokalt med `mammoth` → markdown (samme `htmlToMarkdown`-helper).
- Knap "Gem som kladde": indsætter row i `processes` (status `Draft`, `quality_score: scoreQuality(content)`), opretter første `process_versions`-row (`ai_generated: false`), navigerer til `/process/:id`.
- Ingen AI-kald.

### 6. `src/pages/ProcessDetail.tsx`
- Tilføj knap "Kør AI-kvalitetstjek" (kun synlig hvis `editable`) i action-row.
- Klik kalder `supabase.functions.invoke("claude-parse", { body: { kind: "improve", documentMarkdown: content, rules, title } })` med samme rules-load som i `UploadImprove.improveWithClaude`.
- Vis resultat i en ny sektion (markdown preview) med knapper:
  - "Erstat indhold med forslag" → sætter `content` og åbner editor.
  - "Forkast".
- Loading-state med `Loader2`.

## Tekniske noter
- `Process`-typen i `src/lib/types.ts` bruges allerede; sørg for at Library mapper `quality_score` → `qualityScore` hvis stats-komponenten genbruges, ellers regn direkte på row-felter.
- `dashboard_preferences`-tabellen bruges ikke længere — kan blive stående (ingen migration nødvendig).
- Slet ubrugte komponenter `src/components/dashboard/*` efter refaktor (DashboardStats kan flyttes til `src/components/library/LibraryStats.tsx`, resten slettes).
- `Index.tsx` route: nemmest at lade `/` rendere `<Library />` direkte i `App.tsx` og slette `Index.tsx`.

## Filer der ændres/oprettes/slettes
- ændret: `src/App.tsx`, `src/components/layout/AppSidebar.tsx`, `src/pages/Library.tsx`, `src/pages/ProcessDetail.tsx`
- oprettet: `src/components/library/QuickUploadDialog.tsx`, `src/components/library/LibraryStats.tsx`
- slettet: `src/pages/Dashboard.tsx`, `src/pages/Index.tsx`, `src/components/dashboard/*` (Dashboard*, AddProcessSheet, AISearchDialog, ProcessDetailSheet, ProcessWidget, ProcessListRow — verificeres at intet andet bruger dem)
