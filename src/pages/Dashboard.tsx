import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { Library, Upload, Users, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";

export default function Dashboard() {
  const { processes, users, currentUser, canSee } = useStore();
  const visible = processes.filter(canSee);
  const recent = [...visible].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);

  const stats = [
    { label: "Processer du har adgang til", value: visible.length, icon: Library },
    { label: "Publicerede", value: visible.filter((p) => p.status === "Published").length, icon: Sparkles },
    { label: "Under review", value: visible.filter((p) => p.status === "In Review").length, icon: Upload },
    { label: "Aktive brugere", value: users.filter((u) => u.active).length, icon: Users },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="rounded-xl bg-gradient-hero p-6 md:p-8 text-primary-foreground shadow-elegant">
        <h1 className="text-2xl md:text-3xl font-bold">Velkommen, {currentUser.name.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-primary-foreground/80">
          Forbedr processer med AI, hold styr på biblioteket og styr adgang pr. afdeling.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link to="/upload"><Upload className="mr-2 h-4 w-4" />Upload udkast</Link>
          </Button>
          <Button asChild variant="outline" className="bg-background/10 border-primary-foreground/30 text-primary-foreground hover:bg-background/20">
            <Link to="/library">Gå til bibliotek<ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className="h-8 w-8 text-primary/40" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Senest opdaterede processer</CardTitle>
          <CardDescription>Begrænset til din afdeling ({currentUser.department}) — admin ser alt.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {recent.map((p) => (
            <Link to={`/process/${p.id}`} key={p.id} className="flex items-center justify-between py-3 hover:bg-muted/40 -mx-2 px-2 rounded transition-smooth">
              <div>
                <p className="font-medium text-sm">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.department} · {p.owner}</p>
              </div>
              <StatusBadge status={p.status} />
            </Link>
          ))}
          {recent.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Ingen processer endnu.</p>}
        </CardContent>
      </Card>
    </div>
  );
}