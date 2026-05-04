## Problem

`supabase.functions.invoke("claude-parse", ...)` returnerer "non-2xx status code". Direkte test mod edge function viser at Anthropic API svarer med **404 not_found_error: `model: claude-sonnet-4-20250514`**. Modellen findes ikke (eller er ikke tilgængelig på den aktive Anthropic-konto).

## Løsning

Skift modellen i `supabase/functions/claude-parse/index.ts` til et gyldigt, alment tilgængeligt Claude Sonnet-modelnavn, og forbedre fejl-håndteringen så fejlbeskeden fra Claude vises tydeligt i UI'et.

### Ændringer

1. **`supabase/functions/claude-parse/index.ts`**
   - Skift model fra `claude-sonnet-4-20250514` til `claude-sonnet-4-5` (alias for nyeste Claude Sonnet 4.5 — den korrekte efterfølger til den ikke-eksisterende identifier).
   - Behold samme system-prompt, max_tokens og struktur.
   - Sikre at fejl-respons indeholder Claude's `error.message` (allerede tilfældet).

2. **`src/pages/UploadImprove.tsx`** (lille forbedring)
   - Når `error` fra `functions.invoke` rammes, forsøg at læse `error.context` / response-body så toast viser den rigtige Anthropic-besked (i dag vises kun "Edge Function returned a non-2xx status code").

### Hvorfor `claude-sonnet-4-5`

`claude-sonnet-4-20250514` har aldrig været et offentligt Anthropic-modelnavn. De gyldige nuværende navne er bl.a.:
- `claude-sonnet-4-5` (alias, peger på nyeste)
- `claude-sonnet-4-5-20250929` (snapshot)
- `claude-3-5-sonnet-latest`

Vi vælger aliaset `claude-sonnet-4-5` for at få den nyeste Sonnet-version automatisk.

### Verificering

Efter ændringen kalder jeg edge function direkte med en lille test-payload og bekræfter 200 + markdown-svar, før vi siger fejlen er løst.

### Ingen DB-ændringer

Ingen migrations, ingen schema-ændringer, ingen nye secrets — `ANTHROPIC_API_KEY` er allerede sat.
