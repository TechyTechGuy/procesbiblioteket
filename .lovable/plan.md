## Diagnose

React error #310 = "Rendered fewer/more hooks than during the previous render". I `src/pages/ProcessDetail.tsx` kaldes denne hook **efter** de tidlige returns:

```tsx
if (loading) return <p>Indlæser...</p>;
if (notFound || !process) return <Card>…</Card>;
// …meget kode…
useEffect(() => {
  if (isEditing && pendingCursor !== null && textareaRef.current) { … }
}, [isEditing, pendingCursor]);
```

Første render (loading=true) kører kun 1 useEffect. Næste render (loading=false) kører 2. React crasher → hvid side. ErrorBoundary fanger den nu og viser fejlen.

## Fix

Flyt cursor-positionerings-`useEffect` op **før** alle tidlige returns i `ProcessDetail.tsx`, sammen med `useEffect(() => { load(); }, [id])`. Ingen anden ændring nødvendig — hookens body tjekker allerede `textareaRef.current` og `isEditing`.

## Teknisk

- Kun én fil: `src/pages/ProcessDetail.tsx`.
- Ingen DB-, RLS-, eller logikændringer.
- Bagefter republiceres så `procesbiblioteket.lovable.app` får fixet.