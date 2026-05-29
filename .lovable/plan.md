# Plan

## 1. Favoritter gemmes i Cloud pr. bruger

Vi har allerede tabellen `dashboard_preferences` med kolonnerne `fav_ids` og `order_ids` pr. bruger — den genbruger vi i stedet for at lave en ny tabel.

- Ny hook `src/hooks/useUserPrefs.ts`: henter rækken for `auth.uid()`, opretter den hvis den ikke findes, og eksponerer `favIds`, `orderIds`, `toggleFav(id)`, `setOrder(ids[])`.
- Skriver upserter til `dashboard_preferences` med debounce (300 ms) for `order_ids` så drag-and-drop ikke spammer DB.
- `Library.tsx` fjerner `localStorage`-favoritter og bruger hook'en.
- One-shot migration ved første load: hvis `localStorage.library_favs` findes og `fav_ids` er tom, flyt dem op i Cloud og ryd localStorage.

## 2. Deling på tværs af afdelinger

Processen tilhører stadig én primær afdeling, men uploader kan vælge ekstra synlighed.

**DB-ændringer (migration):**
- `ALTER TABLE processes ADD COLUMN shared_department_ids uuid[] NOT NULL DEFAULT '{}'`
- `ALTER TABLE processes ADD COLUMN visible_to_all boolean NOT NULL DEFAULT false`
- Opdater SELECT-policy `read processes by dept or admin` til også at tillade:
  - `visible_to_all = true AND deleted_at IS NULL`, eller
  - `user_department(auth.uid()) = ANY(shared_department_ids) AND deleted_at IS NULL`
- UPDATE/INSERT-policies forbliver bundet til ejer-afdelingen (kun den primære afdeling bestemmer hvem der må redigere).

**UI:**
- `QuickUploadDialog.tsx` og `ProcessDetail.tsx` (edit-mode): tilføj
  - Checkbox "Synlig for alle afdelinger" → `visible_to_all`
  - Multi-select "Del også med afdelinger" (skjules hvis "synlig for alle" er valgt) → `shared_department_ids`
- `Library.tsx`-kortet får et lille badge "Delt" / "Hele organisationen" når processen ikke tilhører brugerens primære afdeling, så det er tydeligt hvorfor man kan se den.

## 3. Drag-and-drop sortering pr. bruger

- Tilføj `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`.
- `Library.tsx`: pak både grid og liste i `<DndContext>` + `<SortableContext>` og gør hvert kort/række til en `useSortable`-item med drag handle (grip-ikon, vises ved hover).
- Sortering anvendes oven på `filtered`: rækkefølge styres af `orderIds` fra hook'en (favoritter-først dropper vi, da brugeren nu kan sortere selv — favoritter beholder stjerne-markering).
- Når brugeren slipper et item: opdater `orderIds` lokalt og debounced-upsert til `dashboard_preferences.order_ids`.
- Nye processer (ikke i `orderIds`) vises i toppen i standard (updated_at desc), indtil de bliver flyttet.
- Drag deaktiveres når et filter (søgning/afdeling/status/papirkurv) er aktivt, så man ikke gemmer en delvis rækkefølge ved et uheld — vis i stedet en lille hint-tekst.

## Tekniske detaljer

**Migration (rækkefølge):**
1. `ALTER TABLE processes ADD COLUMN ...` (2 kolonner)
2. `DROP POLICY "read processes by dept or admin" ON public.processes`
3. `CREATE POLICY ... USING (has_role(...,'admin') OR (deleted_at IS NULL AND (department_id = user_department(auth.uid()) OR visible_to_all = true OR user_department(auth.uid()) = ANY(shared_department_ids))))`

**Types:** `src/integrations/supabase/types.ts` regenereres automatisk efter migration; `Row`-interfacet i `Library.tsx` udvides med de to nye felter.

**Filer der ændres:**
- ny: `src/hooks/useUserPrefs.ts`
- redigeres: `src/pages/Library.tsx`, `src/pages/ProcessDetail.tsx`, `src/components/library/QuickUploadDialog.tsx`
- nye dependencies: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

## Uden for scope

- Knowledge-items og uploads-tabellen: deling-funktionen gælder kun `processes`.
- Ingen ændring af edit-rettigheder — kun læseadgang udvides.
