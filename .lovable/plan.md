# "Skov" som tredje brand-tema (tilvalg)

Tilføj **Skov** som et tredje tema ved siden af "3" og "Oister" i den eksisterende brand-vælger. Brugeren skifter selv til det og kan altid skifte tilbage. Standard forbliver "3".

## Brand-vælger

I `src/lib/theme.tsx`:
- Udvid `Brand`-typen til `"3" | "oister" | "skov"`.
- Tilføj `theme-skov` til den klasse-liste der toggles på `<html>`.
- Opdater `load()`'s validering så `skov` accepteres.

I brand-knapperne i `AppLayout` (samme sted som "3"/"Oister" i dag):
- Tilføj en tredje knap "Skov" med et lille træ/blad-ikon (lucide `Trees`).

## Designsystem (kun aktivt når `theme-skov` er valgt)

I `src/index.css` tilføjes en ny scope:

```css
.theme-skov { … light tokens … }
.theme-skov.dark { … dark tokens … }
```

**Palet** (HSL)
- Forest deep `#0E2A22` — header/sidebar baggrund, tekst på sand
- Forest primary `#2E5D4B` — primary, accent
- Sage `#8FA98A` — secondary/muted accents
- Sand `#F3ECDD` — `--background`
- Cream `#FBF7EE` — `--card`
- Birch bark `#E6DECC` — `--border`
- Warm clay `#C97B5A` — `--destructive`

**Form**
- `--radius: 1rem` (kun i skov-temaet)
- Bløde, dybe skygger (`--shadow-soft`)
- Primær-knap får pille-form i skov-temaet (via en `data-theme="skov"`-selector i `button.tsx`, så de andre temaer ikke påvirkes)

**Typografi**
- Overskrifter: *Fraunces* (`font-display`)
- Brødtekst/UI: *Inter* (allerede i appen — genbruges)
- Installeres via `bun add @fontsource/fraunces`, importeres i `src/main.tsx`, registreres i `tailwind.config.ts` som `fontFamily.display`.
- `font-display` klasse anvendes på sideoverskrifter (Library hero, Roadmaps, ProcessDetail, Auth) — den er neutral i andre temaer (falder tilbage til sans).

**Hero-illustration**
- Genereres som CDN-asset (`lovable-assets create`) — birketræer + skovsti i akvarel-stil.
- Vises som baggrund i:
  - `Library` hero-band
  - `Auth`/`ForgotPassword`/`ResetPassword` (split-screen)
- Kun renderet når `theme === "skov"` (conditional via `useTheme()`), så "3" og "Oister" forbliver uforandrede.

## Omfang — hvor temaet slår igennem

Alle komponenter bruger allerede semantiske tokens (`bg-background`, `bg-card`, `text-foreground`, `bg-primary`, …), så når `theme-skov` er aktiv, opdateres automatisk:

| Område | Resultat |
|---|---|
| `AppLayout` + `AppSidebar` | Mørkegrøn topbjælke + sand main, sage hover på sidebar |
| `Library` | Sand baggrund, creme kort, hero-illustration som backdrop |
| `ProcessDetail` | Sand baggrund, creme indholdskort, forest knapper |
| `Roadmaps` + `RoadmapDetail` | Birkebark-borders, creme kanban-kort, sage status-prik |
| `Knowledge`, `UploadImprove`, `Admin`, `AccountSettings` | Samme palet, samme rolige vibe |
| `Auth`-sider | Splitscreen med skov-illustration |
| Dark mode | Skov-deep baggrund, creme tekst, dæmpede sage-accenter |

## Tekniske ændringer

- `src/lib/theme.tsx` — udvid Brand-type + persisteret validering.
- `src/components/layout/AppLayout.tsx` — tilføj "Skov"-knap i brand-vælgeren.
- `src/index.css` — nye `.theme-skov` + `.theme-skov.dark` token-blokke (eksisterende `.theme-3` og `.theme-oister` røres ikke).
- `tailwind.config.ts` — registrér `fontFamily.display: ["Fraunces", "serif"]`.
- `src/main.tsx` — `import "@fontsource/fraunces"`.
- `src/components/ui/button.tsx` — pille-radius variant scoped via `:where(.theme-skov) &` så den kun gælder skov-temaet.
- Asset: `src/assets/forest-hero.png.asset.json` via `lovable-assets`.
- Conditional hero-illustration i `Library.tsx` + `Auth.tsx` baseret på `useTheme().brand === "skov"`.

Ingen ændringer i datamodel, RLS, edge functions eller forretningslogik. "3" og "Oister" forbliver præcis som i dag — det er rent additivt.

## Designretninger først?

Jeg implementerer skov-temaet direkte ud fra ovenstående palet/typografi. Hvis du vil have 3 alternative skov-retninger at vælge imellem (fx mere dæmpet, mere illustrativ, mere minimalistisk), så sig til, så genererer jeg rendrede previews først.
