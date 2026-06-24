interface Row {
  status: string;
  quality_score: number;
}

export const QUALITY_THRESHOLD = 50;

export function LibraryStats({ rows }: { rows: Row[] }) {
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + (r.quality_score ?? 0), 0) / rows.length) : 0;
  const needsAttention = rows.filter((r) => r.status === "In Review" || r.status === "Draft" || (r.quality_score ?? 100) < QUALITY_THRESHOLD).length;
  const published = rows.filter((r) => r.status === "Published").length;
  const drafts = rows.filter((r) => r.status === "Draft").length;

  const stats = [
    { label: "Gns. kvalitet", value: avg, sub: "ud af 100" },
    { label: "Kræver opmærksomhed", value: needsAttention, sub: "lav score, kladde eller review",
      color: needsAttention > 0 ? "text-warning" : undefined },
    { label: "Publicerede", value: published, sub: "klar til brug", color: "text-success" },
    { label: "Kladder", value: drafts, sub: "ikke publiceret" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-secondary/50 rounded-lg p-3 space-y-0.5">
          <p className="text-xs text-muted-foreground">{s.label}</p>
          <p className={`text-2xl font-semibold ${s.color ?? ""}`}>{s.value}</p>
          <p className="text-xs text-muted-foreground">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}