import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { QualityMeter } from "@/components/QualityMeter";
import { LibraryStats, QUALITY_THRESHOLD } from "@/components/library/LibraryStats";
import { useAuth } from "@/lib/auth";
import { Status, STATUSES } from "@/lib/types";
import { ArrowDownAZ, ArrowUpAZ, ShieldCheck } from "lucide-react";

interface Row {
  id: string;
  title: string;
  status: Status;
  owner_name: string;
  department_id: string;
  quality_score: number;
  deleted_at: string | null;
}

function reasonsFor(r: Row): string[] {
  const reasons: string[] = [];
  if ((r.quality_score ?? 0) < QUALITY_THRESHOLD) reasons.push("Lav kvalitet");
  if (r.status === "Draft") reasons.push("Ikke publiceret");
  if (r.status === "In Review") reasons.push("Afventer review");
  return reasons;
}

export default function Quality() {
  const { departments } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [dept, setDept] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("processes")
        .select("id, title, status, owner_name, department_id, quality_score, deleted_at")
        .is("deleted_at", null);
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? "—";

  const needsAttention = useMemo(() => {
    return rows
      .filter((r) => reasonsFor(r).length > 0)
      .filter((r) => (dept === "all" ? true : r.department_id === dept))
      .filter((r) => (status === "all" ? true : r.status === status))
      .sort((a, b) =>
        sortDir === "asc"
          ? (a.quality_score ?? 0) - (b.quality_score ?? 0)
          : (b.quality_score ?? 0) - (a.quality_score ?? 0),
      );
  }, [rows, dept, status, sortDir]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Kvalitet & overblik
        </h1>
        <p className="text-sm text-muted-foreground">
          Processer der ikke overholder retningslinjerne og kræver opmærksomhed.
        </p>
      </div>

      <LibraryStats rows={rows} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="sm:w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle afdelinger</SelectItem>
            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statusser</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
          {sortDir === "asc" ? <ArrowUpAZ className="mr-2 h-4 w-4" /> : <ArrowDownAZ className="mr-2 h-4 w-4" />}
          Kvalitet {sortDir === "asc" ? "lavest først" : "højest først"}
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0 divide-y">
          {loading && <p className="py-10 text-center text-sm text-muted-foreground">Indlæser...</p>}
          {!loading && needsAttention.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Ingen processer kræver opmærksomhed. 🎉
            </p>
          )}
          {needsAttention.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/process/${p.id}`)}
              className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-smooth grid grid-cols-12 gap-3 items-center"
            >
              <div className="col-span-12 md:col-span-4">
                <p className="font-medium leading-tight">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {deptName(p.department_id)} · {p.owner_name}
                </p>
              </div>
              <div className="col-span-6 md:col-span-2">
                <StatusBadge status={p.status} />
              </div>
              <div className="col-span-6 md:col-span-3">
                <QualityMeter score={p.quality_score ?? 0} label="" />
              </div>
              <div className="col-span-12 md:col-span-3 flex flex-wrap gap-1 justify-start md:justify-end">
                {reasonsFor(p).map((r) => (
                  <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                ))}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}