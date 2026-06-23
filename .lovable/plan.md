## Mål
Forbedre kvaliteten af dansk transskription i `voice-transcribe`.

## Ændringer

**`supabase/functions/voice-transcribe/index.ts`**
1. Skift model fra `openai/gpt-4o-mini-transcribe` → `openai/gpt-4o-transcribe` (større/mere nøjagtig variant, markant bedre på ikke-engelsk).
2. Tilføj `language: "da"` til upstream FormData, så modellen ikke skal gætte sprog — det giver typisk stort løft i nøjagtighed og færre engelske "hallucinationer" på dansk tale.

Resten af funktionen (validering, fejlhåndtering, respons-format `{ text }`) og frontend (`VoiceProcessDialog.tsx`) er uændret.

## Noter
- Begge modeller kører via Lovable AI Gateway med samme `LOVABLE_API_KEY` — ingen nye secrets.
- `gpt-4o-transcribe` er dyrere pr. kald end mini, men kvalitetsforskellen på dansk er betydelig.
- Hvis du hellere vil beholde mini-modellen og kun tilføje `language: "da"` først, så sig til.
