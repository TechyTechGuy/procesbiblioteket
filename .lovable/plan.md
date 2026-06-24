## Diagnose

Linket peger på den **publicerede** version (`procesbiblioteket.lovable.app`), ikke preview. Jeg har tjekket:

- Processen findes i databasen (titel `01_onboarding`, 6.256 tegn indhold, status Draft) — data er fint.
- `ProcessDetail.tsx`-koden i preview er korrekt: viser "Indlæser…", derefter indhold eller "Ingen adgang"-kort. Ingen åbenlys crash-sti.
- Ingen runtime-errors i nuværende preview.
- Vite-build kører uden fejl lige nu.

Den hvide side på den publicerede URL skyldes derfor med stor sandsynlighed at **publiceringen er forældet** — den blev sidst publiceret før de seneste ændringer (forest-tema, dobbeltklik-til-rediger, Kvalitet-side, voice-roadmap), og den gamle bundle crasher når den støder på data eller routes der ikke matcher.

## Plan

**1. Tilføj en global ErrorBoundary** så fremtidige crashes viser en venlig fejlbesked i stedet for en tom hvid side.

- Ny fil `src/components/ErrorBoundary.tsx`: klassisk React class-komponent med `componentDidCatch`, logger fejlen til konsollen og viser et kort med:
  - "Noget gik galt på denne side"
  - Fejlmeddelelse (sammenklappelig)
  - Knapper: "Prøv igen" (reset state) og "Tilbage til biblioteket"
- Wrap `<Routes>` (eller hele `AppLayout`-children) i `src/App.tsx` med `<ErrorBoundary>` så alle ruter er dækket, men sidebar/header forbliver synlige.

**2. Republicér appen** så den nyeste kode kommer ud på `procesbiblioteket.lovable.app`. Når den nye bundle er ude, vil `/process/:id` virke igen — og hvis der mod forventning stadig er en fejl, vil ErrorBoundary nu vise hvad der går galt i stedet for en hvid side.

## Teknisk

- Kun frontend-ændringer. Ingen DB, RLS, edge functions eller forretningslogik.
- Ingen ændringer i `ProcessDetail.tsx` eller datahentning — vi har ingen evidens for at koden i preview er brudt.
- Dansk UI i ErrorBoundary, genbruger `Card`, `Button` og lucide-ikoner.

Hvis problemet fortsætter efter republicering, bruger vi ErrorBoundary-outputtet til at finde den faktiske rod og fixer den i en opfølgning.