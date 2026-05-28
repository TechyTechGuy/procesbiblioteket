import { Process } from "@/lib/types";

interface Props {
  processes: Process[];
}

export function DashboardStats({ processes }: Props) {
  const avg = processes.length
    ? Math.round(processes.reduce((s, p) => s + (p.qualityScore ?? 0), 0) / processes.length)
    : 0;
  const needsAttention = processes.filter(
    (p) => p.status === "In Review" || (p.qualityScore ?? 100) < 50
  ).length;
  const published = processes.filter((p) => p.status === "Published").length;

  const stats = [
    { label: "Processer", value: processes.length, sub: "på dashboardet" },
    { label: "Gns. kvalitet", value: avg, sub: "ud af 100" },
    {
      label: "Kræver opmærksomhed",
      value: needsAttention,
      sub: "lav score eller review",
      color: needsAttention > 0 ? "text-warning" : undefined,
    },
    { label: "Publicerede", value: published, sub: "klar til brug", color: "text-success" },
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
