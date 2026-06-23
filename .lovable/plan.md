## Ændringer i `src/pages/ProcessDetail.tsx`

Kun læsbarhed/pladsudnyttelse — ingen funktionsændringer.

### 1. Bredere container
Skift den yderste `<div>` fra `max-w-5xl` → `max-w-7xl`.

### 2. Fjern indre scroll
- Indholds-preview: fjern ` max-h-[600px] overflow-auto` fra `proseClasses + ...`.
- AI-forslag boks: fjern ` max-h-[500px] overflow-auto`.
- Versionshistorik items: fjern ` max-h-[400px] overflow-auto`.

### 3. Nye `proseClasses` — tydeligere hierarki

```ts
const proseClasses =
  "prose max-w-none dark:prose-invert leading-relaxed rounded-md border bg-background p-4 " +
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 " +
  "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 " +
  "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 " +
  "[&_p]:leading-relaxed " +
  "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3 " +
  "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left " +
  "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 " +
  "[&_tbody_tr:nth-child(even)]:bg-muted/30 " +
  "[&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded";
```

Bevarer alle tabel-, border- og dark-mode-klasser; skifter base fra `prose-sm` til `prose` og tilføjer zebra-striber + tydelige headings.

### 4. Redigerings-Textarea
Skift `className="font-mono text-xs"` → `className="text-sm leading-relaxed p-3"`.

### Hvad der IKKE røres
AI-tjek, versionsoprettelse, kopier-knapper, gem-flow, delings-checkboxes, status-select, routing, datahentning — uændret.
