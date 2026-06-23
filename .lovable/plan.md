## Problem

Dialogen viser kun den generiske besked "Edge Function returned a non-2xx status code". Det er fordi `supabase.functions.invoke()` smider en `FunctionsHttpError` hvor `error.message` er hardcoded — JSON-body'en med den rigtige fejl fra ElevenLabs bliver smidt væk. Derfor kan vi ikke se hvad der reelt fejler (sandsynligvis ugyldigt `model_id`, ugyldig `language_code`, eller en API-key issue).

## Plan

**1. Få den rigtige fejl frem i klienten** (`VoiceProcessDialog.tsx`)
Læs response-body'en når invoke fejler:
```ts
if (error) {
  let msg = error.message;
  if ((error as any).context?.json) {
    const body = await (error as any).context.json().catch(() => null);
    if (body?.error) msg = body.error;
  }
  throw new Error(msg);
}
```
Gør det samme for `voice-structure-process`.

**2. Tilføj logging i `voice-transcribe`**
`console.log` af blob-størrelse, mime/ext, og fuldt ElevenLabs-svar (status + body) før vi returnerer. Så kan vi se det i edge-logs hvis det fejler igen.

**3. Tjek ElevenLabs-parametre**
Den nuværende kode bruger `model_id: "scribe_v2"` og `language_code: "dan"`. Hvis ElevenLabs returnerer "model not found" eller lignende, retter vi til den korrekte værdi (formentlig `scribe_v1`) — men det bekræfter vi først fra den nye fejlbesked, så vi ikke gætter.

**4. Verificér i preview**
Optag igen, læs den rigtige fejl, og deploy den endelige rettelse.

Ingen ændringer til UI, Library-side, eller struktureringsfunktionen ud over fejl-parsing.