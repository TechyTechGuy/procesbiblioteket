import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { Search, Lock } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { QualityMeter } from "@/components/QualityMeter";

export default function Library() {
  const { processes, canSee, departments, currentUser } = useStore();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    return processes
      .filter(canSee)
      .filter((p) => (dept === "all" ? true : p.department === dept))
      .filter((p) => (status === "all" ? true : p.status === status))
      .filter((p) => (q ? (p.title + p.tags.join(" ") + p.content).toLowerCase().includes(q.toLowerCase()) : true));
  }, [processes, q, dept, status, canSee]);

  const hidden = processes.length - processes.filter(canSee).length;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Procesbibliotek</h1>
        <p className="text-sm text-muted-foreground">
          {currentUser.role === "Admin"
            ? "Du ser alle processer på tværs af afdelinger."
            : `Du ser processer i din afdeling (${currentUser.department}).`}
          {hidden > 0 && currentUser.role !== "Admin" && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-warning">
              <Lock className="h-3 w-3" />{hidden} skjult af adgangskontrol
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg i titel, tags eller indhold..." className="pl-8" />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle afdelinger</SelectItem>
            {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statusser</SelectItem>
            {["Draft", "In Review", "Published", "Archived"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Link to={`/process/${p.id}`} key={p.id}>
            <Card className="h-full shadow-card hover:shadow-elegant transition-smooth hover:-translate-y-0.5">
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{p.title}</h3>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{p.content}</p>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{p.department}</span>
                  <span>{p.owner}</span>
                </div>
                <QualityMeter score={p.qualityScore} />
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3"><CardContent className="py-12 text-center text-sm text-muted-foreground">Ingen processer matcher dine filtre.</CardContent></Card>
        )}
      </div>
    </div>
  );
}