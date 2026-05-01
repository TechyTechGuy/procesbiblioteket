import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { Library, Upload, Users, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Status } from "@/lib/types";

interface ProcessRow {
  id: string;
  title: string;
  status: Status;
  owner_name: string;
  updated_at: string;
  department_id: string;
}

export default function Dashboard() {
  const { profile, isAdmin, myDepartmentName, departments } = useAuth();
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    supabase
      .from("processes")
      .select("id, title, status, owner_name, updated_at, department_id")
      .order("updated_at", { ascending: false })
      .then(({ data }) => setProcesses((data as ProcessRow[]) ?? []));
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setUserCount(count ?? 0));
  }, []);

  const recent = processes.slice(0, 4);
  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? "—";

  const stats = [
    { label: "Processer du har adgang til", value: processes.length, icon: Library },
    { label: "Publicerede", value: processes.filter((p) => p.status === "Published").length, icon: Sparkles },
    { label: "Under review", value: processes.filter((p) => p.status === "In Review").length, icon: Upload },
    { label: "Brugere", value: userCount, icon: Users },
  ];

  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="rounded-xl bg-gradient-hero p-6 md:p-8 text-primary-foreground shadow-elegant">
        <h1 className="text-2xl md:text-3xl font-bold">Velkommen, {firstName} 👋</h1>
        <p className="mt-1 text-primary-foreground/80">
          Forbedr processer, hold styr på biblioteket og styr adgang pr. afdeling.
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
          <CardDescription>
            {isAdmin ? "Du ser alt på tværs af afdelinger." : `Begrænset til din afdeling (${myDepartmentName ?? "ingen"}).`}
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {recent.map((p) => (
            <Link to={`/process/${p.id}`} key={p.id} className="flex items-center justify-between py-3 hover:bg-muted/40 -mx-2 px-2 rounded transition-smooth">
              <div>
                <p className="font-medium text-sm">{p.title}</p>
                <p className="text-xs text-muted-foreground">{deptName(p.department_id)} · {p.owner_name}</p>
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
