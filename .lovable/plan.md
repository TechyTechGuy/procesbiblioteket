## Mål

Tilføjede processer (pinned), deres rækkefølge og favoritter skal gemmes per bruger i databasen, så dashboardet følger med på tværs af enheder — i stedet for kun at ligge i localStorage.

## Ændringer

### 1. Ny tabel: `dashboard_preferences`
Én række per bruger:
- `user_id` (uuid, PK, FK → auth.users)
- `pinned_ids` (uuid[]) — tilføjede processer
- `order_ids` (uuid[]) — custom rækkefølge
- `fav_ids` (uuid[]) — favoritter
- `updated_at` (timestamptz)

RLS: bruger kan kun læse/skrive sin egen række (`user_id = auth.uid()`). GRANTs til `authenticated` + `service_role`.

### 2. `src/pages/Dashboard.tsx`
- Erstat localStorage-load med et `SELECT` fra `dashboard_preferences` ved mount (efter auth).
- Erstat localStorage-save (de to `useEffect` på `pinnedIds/order` og `favIds`) med en debounced `upsert` til samme tabel.
- Behold localStorage som fallback ved første migrering (hvis DB-række er tom og localStorage har data, upsert det én gang).
- Vis intet ekstra UI — opførsel forbliver identisk, bare persistent på tværs af enheder.

## Tekniske noter
- Debounce upsert ~500 ms for at undgå skriv per drag/klik.
- Brug `upsert({ user_id, ... }, { onConflict: 'user_id' })`.
- Ingen ændringer i `AddProcessSheet`, `DashboardGrid` osv. — de bruger stadig callbacks fra `Dashboard.tsx`.
