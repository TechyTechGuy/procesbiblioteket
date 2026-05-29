## Mål
Gør procestitlen redigerbar i `ProcessDetail.tsx` når brugeren er i redigeringstilstand.

## Ændringer i `src/pages/ProcessDetail.tsx`

1. Tilføj `title` state der initialiseres fra `process.title` (på linje med eksisterende `content`/`status` state).
2. I header-blokken: når `isEditing && editable`, render et `<Input>` (stor tekst-styling) i stedet for `<h1>{process.title}</h1>`. Ellers vis h1 som nu. StatusBadge bliver ved siden af i begge tilfælde.
3. Udvid `save()` til at inkludere `title: title.trim()` i `update()`-kaldet. Validér at title ikke er tom — ellers `toast.error("Titel må ikke være tom")` og afbryd.
4. `cancelEdit()` nulstiller også `title` til `process.title`.
5. Notes på den nye version: behold `Status: ${status}` (uændret).

## Ud af scope
- Ingen DB-ændringer (RLS tillader allerede update på processes for editors+).
- Ingen ændringer i Library eller andre steder.
