import { Progress } from "@/components/ui/progress";

export function QualityMeter({ score, label = "Kvalitet" }: { score: number; label?: string }) {
  const color = score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${color}`}>{score}/100</span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );
}