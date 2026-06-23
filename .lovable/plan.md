## Mål

Tilføj en **"Indtal proces"**-knap ved siden af "Upload proces" på Procesbibliotek-siden. Klik åbner en dialog hvor brugeren optager dansk tale → ElevenLabs Scribe transskriberer → en chat-model strukturerer fritekst til felter → felterne forudfyldes i den eksisterende `QuickUploadDialog` som fuldt redigerbart draft. Brugeren retter til og trykker "Gem som kladde" som normalt.

## Brugerflow

1. På `/` (Library) ses to knapper: **Upload proces** og **Indtal proces** (mic-ikon).
2. Klik på "Indtal proces" åbner en lille dialog med:
   - Stor mikrofon-knap (start/stop)
   - Live timer + animeret status ("Optager… 0:12")
   - Når stoppet: progress-status "Transskriberer…" → "Strukturerer…"
   - Read-only visning af den rå transskription (så brugeren ser at det virker)
   - Knap "Brug som udkast" (aktiv når struktureringen er færdig)
3. "Brug som udkast" lukker mic-dialogen og åbner `QuickUploadDialog` med felterne forudfyldt:
   - `procesnavn` → Titel
   - `afdeling` → Afdeling-select (kun hvis navn matcher en eksisterende afdeling)
   - `beskrivelse` + `ansvarlig` + `trin` → smeltet til markdown i Indhold-feltet
4. Brugeren retter til og trykker "Gem som kladde" (eksisterende flow).

## Backend (Lovable Cloud edge functions)

### `voice-transcribe`
- Input: `multipart/form-data` med audio-blob (webm/mp4).
- Henter `ELEVENLABS_API_KEY` fra ElevenLabs-connector.
- Kalder `POST https://api.elevenlabs.io/v1/speech-to-text` med `model_id=scribe_v2`, `language_code=dan`.
- Returnerer `{ text }`. CORS + JWT-verify.

### `voice-structure-process`
- Input: `{ transcript: string }`. JWT-verify.
- Henter afdelinger frisk fra DB i hvert kald: `select name from departments`.
- Kalder Lovable AI Gateway `google/gemini-3.5-flash` med `response_format: json_object`.
- System-prompt = den danske prompt fra requesten, med afdelingsnavne indsat dynamisk som gyldige værdier.
- Returnerer `{ procesnavn, afdeling, ansvarlig, beskrivelse, trin: string[] }`.
- Håndterer 402/429 fra gateway med klare fejl.

## Frontend

### Ny: `src/components/library/VoiceProcessDialog.tsx`
- Dialog med mic-knap, MediaRecorder-flow, states: `idle | recording | transcribing | structuring | done | error`.
- Foretrukket `audio/webm`, fallback `audio/mp4`. Validerer blob > 1 KB.
- Kalder `voice-transcribe` → viser rå tekst → kalder `voice-structure-process`.
- Prop: `onUseAsDraft(result: { procesnavn, afdeling, ansvarlig, beskrivelse, trin })`.

### Ændret: `src/components/library/QuickUploadDialog.tsx`
- Tilføj valgfri prop `initial?: { title?: string; departmentId?: string; content?: string }`.
- Når prop'en ændres mens dialogen åbnes, prefyldes `title`, `departmentId`, `content`. Brugeren kan overskrive alt.

### Ændret: `src/pages/Library.tsx`
- Ny `voiceOpen` state + ny knap "Indtal proces" (Mic-ikon) ved siden af "Upload proces" (kun for `canEdit`).
- Ny `voiceDraft` state. `onUseAsDraft`: match `afdeling` mod `departments` (case-insensitive), byg markdown-content:
  ```
  {beskrivelse}

  **Ansvarlig:** {ansvarlig}

  ## Trin
  1. …
  2. …
  ```
  → sæt `voiceDraft`, luk mic-dialog, åbn `QuickUploadDialog` med `initial={voiceDraft}`.

## Connector & secrets

- Kræver **ElevenLabs**-connector linket. Hvis ikke linket: kald `standard_connectors--connect` med `connector_id: "elevenlabs"`. `ELEVENLABS_API_KEY` bliver tilgængelig i edge functions.
- `LOVABLE_API_KEY` er allerede til stede.

## Teknisk note

- Batch-transkription (ikke streaming) — struktureringen skal alligevel vente på færdig tekst.
- Model: `google/gemini-3.5-flash` (stærk reasoning, dansk).

## Filer

- ny: `supabase/functions/voice-transcribe/index.ts`
- ny: `supabase/functions/voice-structure-process/index.ts`
- ny: `src/components/library/VoiceProcessDialog.tsx`
- ændret: `src/components/library/QuickUploadDialog.tsx` (tilføj `initial`-prop)
- ændret: `src/pages/Library.tsx` (tilføj knap + dialog-orkestrering)
- connector: link ElevenLabs hvis ikke allerede linket
