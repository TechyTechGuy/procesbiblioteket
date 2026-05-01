import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { QualityMeter } from "@/components/QualityMeter";
import { supabase } from "@/integrations/supabase/client";
import { Status, STATUSES } from "@/lib/types";

interface Row {
  id: string;
  title: string;
  content: string;
  status: Status;
  owner_name: string;
  tags: string[];
  quality_score: number;
  department_id: string;
}

export default function Library() {
  const { departments, isAdmin, myDepartmentName } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    supabase
      .from("processes")
      .select("id, title, content, status, owner_name, tags, quality_score, department_id")
      .order("updated_at", { ascending: false })
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);

  const filtered = useMemo(() => {
    return rows
      .filter((p) => (dept === "all" ? true : p.department_id === dept))
      .filter((p) => (status === "all" ? true : p.status === status))
      .filter((p) => (q ? (p.title + p.tags.join(" ") + p.content).toLowerCase().includes(q.toLowerCase()) : true));
  }, [rows, q, dept, status]);

  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? "—";

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Procesbibliotek</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Du ser alle processer på tværs af afdelinger."
            : `Du ser processer i din afdeling (${myDepartmentName ?? "ingen tildelt"}).`}
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
            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statusser</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                  <span>{deptName(p.department_id)}</span>
                  <span>{p.owner_name}</span>
                </div>
                <QualityMeter score={p.quality_score} />
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
