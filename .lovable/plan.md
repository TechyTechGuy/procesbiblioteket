# Plan: Dokument-upload i Vidensbanken (PDF/Word)

## Mål
Gør det muligt at vedhæfte PDF- eller Word-filer til et vidensbank-element, så fx en Code of Conduct kan ligge i Vidensbanken. Admin vælger pr. dokument om det er ren reference eller skal indgå i AI-forbedringen.

## UX

På siden Vidensbanken:
- Ny knap **"Upload dokument"** ved siden af "Tilføj regel" (kun synlig for admin og process owners).
- Dialog med felter: Titel, Type (forvalgt **"Dokument"**, kan også være "Code of Conduct"), Afdeling (Alle / specifik), Filvælger (.pdf/.docx), kontakt **"Brug i AI-forbedring"** (toggle, kun admin kan ændre, default fra).
- Eksisterende elementer i listen får:
  - Et lille **filikon + filnavn** når der er en vedhæftet fil.
  - Knap **"Åbn"** (åbner i ny fane via signed URL) og **"Download"**.
  - Eksisterende **Aktiv-toggle** styrer om elementet vises i AI-forbedring (kun relevant når "Brug i AI" er sat).
- Pr. dokument vises et badge: **"Reference"** eller **"Aktiv regel"**.

## Adgang
- Upload/slet/redigér: admin + process_owner.
- Læs/download: alle authenticated brugere; afdelingsfiltrering som i dag (globalt eller egen afdeling).

## Datamodel

Udvider eksisterende tabel `knowledge_items` (i stedet for ny tabel — så listen forbliver én samlet vidensbank):

Nye kolonner:
- `file_path text` — sti i storage-bucket (null for tekst-regler).
- `file_name text` — original filnavn til visning.
- `file_mime text` — `application/pdf` eller `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- `file_size_bytes integer`.
- `use_in_ai boolean default false` — om dokumentets indhold skal indgå i AI-forbedring.
- `extracted_text text` — udtrukket tekst (sat ved upload, bruges af AI).
- `scope text default 'department'` med værdier `'global'` eller `'department'` — admin vælger.
- `created_by uuid` — hvem uploadede.

Indeks på `(active, use_in_ai)` for hurtigt opslag i AI-flow.

## Storage
- Genbruger eksisterende **`uploads`** bucket (privat) under prefix `knowledge/{knowledge_item_id}/{filnavn}`.
- Adgang via **signed URLs** (60 min) ved download/visning.
- Storage-policies: læs for authenticated, upload/slet for admin + process_owner.

## RLS
Opdaterer policies på `knowledge_items`:
- `INSERT/UPDATE/DELETE`: admin OR process_owner.
- `SELECT`: uændret (admin OR global OR egen afdeling).

## Tekst-udtræk (til AI)

Sker client-side ved upload:
- **Word (.docx)**: `mammoth` → HTML → markdown (allerede installeret).
- **PDF**: `pdfjs-dist` → side-for-side tekstudtræk.

Den udtrukne tekst gemmes i `extracted_text`. Hvis udtræk fejler, gemmes filen alligevel og brugeren får besked om at "Brug i AI" ikke kan slås til.

AI-forbedrings-flowet (vidensbank-tællingen i `UploadImprove`) udvides så det inkluderer dokumenter hvor `active=true` og `use_in_ai=true`, og bruger `extracted_text` som regelindhold.

## Tekniske detaljer

Filer der ændres/oprettes:
- Migration: nye kolonner på `knowledge_items`, opdaterede RLS-policies, storage-policies på `uploads`.
- `src/pages/Knowledge.tsx`: ny upload-dialog, file-list visning, åbn/download-knapper, "Brug i AI"-toggle for admin.
- Ny util `src/lib/extractText.ts`: `extractFromDocx(file)` og `extractFromPdf(file)`.
- `src/pages/UploadImprove.tsx`: udvider knowledge-count og evt. AI-prompt så dokumenter med `use_in_ai=true` tæller med.
- `package.json`: tilføjer `pdfjs-dist`.

Filstørrelses-grænse: 10 MB (valideres client-side før upload).

## Out of scope
- Versionering af dokumenter (overskriv = ny upload, gammel slettes).
- OCR af scannede PDF'er (kun tekst-baserede PDF'er understøttes til AI-brug; filen kan stadig uploades som ren reference).
- Preview/inline-visning af PDF (åbnes i ny fane).
