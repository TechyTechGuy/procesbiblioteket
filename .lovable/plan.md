## Mål

Gør appen mere farverig og giv brugeren mulighed for at vælge mellem to brand-temaer (**3** og **Oister**) samt lys/mørk visning. Standard: lyst "3"-tema (orange/sort).

## Brand-paletter

**3 (3.dk)** – kraftig orange + sort/hvid
- Primary: orange `#FF6A13`
- Foreground/CTA-knap mørk: `#0A0A0A`
- Accent: dyb sort

**Oister (oister.dk)** – lilla + gul/grøn
- Primary: lilla `#5C2D91`
- Accent: gul `#FFC400`
- Success/CTA: grøn `#7AC143`

Hvert brand får både en **light** og **dark** variant (totalt 4 themes: `3-light`, `3-dark`, `oister-light`, `oister-dark`).

## Ændringer

### 1. `src/index.css`
- Behold semantiske tokens, men flyt brand-specifikke værdier til klasse-scopede blokke:
  - `:root, .theme-3.light` → 3 light (default)
  - `.theme-3.dark` → 3 dark
  - `.theme-oister.light` → Oister light
  - `.theme-oister.dark` → Oister dark
- Opdater alle eksisterende tokens (`--primary`, `--accent`, `--success`, `--warning`, `--gradient-primary`, `--gradient-hero`, `--shadow-elegant`, sidebar-tokens) pr. theme i HSL.
- Tilføj farverig gradient-baggrund pr. theme så UI'et føles mere levende (bruges i `bg-gradient-subtle` og `bg-gradient-hero`).

### 2. Ny `src/lib/theme.tsx` (ThemeProvider)
- Context med `{ brand: "3" | "oister", mode: "light" | "dark", setBrand, setMode, toggleMode }`.
- Persist i `localStorage` (key `pb_theme`) – default `{ brand: "3", mode: "light" }`.
- Sætter to klasser på `<html>`: `theme-3|theme-oister` og `light|dark`.

### 3. `src/App.tsx`
- Wrap app-tree i `<ThemeProvider>` (yderst).

### 4. `src/components/layout/AppLayout.tsx` – header
- Tilføj to nye kontroller i højre side, før badge:
  - **Brand-select** (lille Select / ToggleGroup): "3" | "Oister"
  - **Mode-toggle** (icon Button): Sun/Moon ikon, skifter light/dark
- Brug `useTheme()` hook.

### 5. Auth-side
- Ingen specielle ændringer; theme gælder også her, da `<html>`-klasser sættes globalt.

## Tekniske detaljer

- Alle farver konverteres til HSL og lægges som CSS variables – ingen hex direkte i komponenter.
- `tailwind.config.ts` rører vi ikke; eksisterende `hsl(var(--token))`-mapping virker uændret.
- Sidebar bruger allerede `--sidebar-*` tokens, så de opdateres pr. theme for at matche brand.
- `toaster` (sonner) bruger `next-themes`-style theme prop; vi tilføjer ikke `next-themes` – `useTheme()` hook eksponerer `mode` til Sonner via en lille wrapper-update i `sonner.tsx` (læser fra vores context i stedet for `next-themes`).

## Ud af scope
- Ingen ændringer til business-logic, edge functions, DB.
- Pages selv refaktoreres ikke – de arver de nye tokens automatisk.