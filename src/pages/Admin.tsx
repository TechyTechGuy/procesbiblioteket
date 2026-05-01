import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { Role, ROLES, ROLE_LABEL } from "@/lib/types";
import { Plus, Trash2, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UserRow {
  id: string;
  full_name: string;
  email: string | null;
  department_id: string | null;
  role: Role | null;
}

export default function Admin() {
  const { isAdmin, departments, refresh, user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [newDept, setNewDept] = useState("");

  const loadUsers = async () => {
    const { data: profs } = await supabase.from("profiles").select("id, full_name, email, department_id");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const order: Role[] = ["admin", "process_owner", "editor", "viewer"];
    const rows: UserRow[] = (profs ?? []).map((p) => {
      const userRoles = (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as Role);
      const top = order.find((r) => userRoles.includes(r)) ?? null;
      return { id: p.id, full_name: p.full_name, email: p.email, department_id: p.department_id, role: top };
    });
    setUsers(rows);
  };

  useEffect(() => { if (isAdmin) loadUsers(); }, [isAdmin]);

  if (!isAdmin) {
    return (
      <Card className="max-w-md mx-auto mt-12"><CardContent className="pt-6 text-center space-y-3">
        <Lock className="mx-auto h-10 w-10 text-warning" />
        <h2 className="font-semibold">Kun for administratorer</h2>
        <p className="text-sm text-muted-foreground">Du skal have admin-rolle for at se denne side.</p>
      </CardContent></Card>
    );
  }

  const setUserRole = async (u: UserRow, role: Role) => {
    // Replace role: delete existing, insert new
    await supabase.from("user_roles").delete().eq("user_id", u.id);
    const { error } = await supabase.from("user_roles").insert({ user_id: u.id, role });
    if (error) { toast.error(error.message); return; }
    setUsers((arr) => arr.map((x) => x.id === u.id ? { ...x, role } : x));
    toast.success("Rolle opdateret");
  };

  const setUserDept = async (u: UserRow, deptId: string) => {
    const { error } = await supabase.from("profiles").update({ department_id: deptId }).eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    setUsers((arr) => arr.map((x) => x.id === u.id ? { ...x, department_id: deptId } : x));
    toast.success("Afdeling opdateret");
  };

  const addDept = async () => {
    const name = newDept.trim();
    if (!name) return;
    const { error } = await supabase.from("departments").insert({ name });
    if (error) { toast.error(error.message); return; }
    setNewDept("");
    toast.success("Afdeling tilføjet");
    refresh();
  };

  const removeDept = async (id: string) => {
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Afdeling fjernet");
    refresh();
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" />Brugere & adgang</h1>
        <p className="text-sm text-muted-foreground">Administrér brugere, deres roller og afdelinger.</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Brugere ({users.length})</TabsTrigger>
          <TabsTrigger value="departments">Afdelinger ({departments.length})</TabsTrigger>
          <TabsTrigger value="rules">Adgangsregler</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Brugere</CardTitle>
              <CardDescription>Brugere oprettes ved selv at registrere sig på login-siden. Her kan du ændre rolle og afdeling.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Navn</TableHead><TableHead>Email</TableHead>
                  <TableHead>Rolle</TableHead><TableHead>Afdeling</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || "(uden navn)"}{u.id === user?.id && <span className="ml-1 text-xs text-muted-foreground">(dig)</span>}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{u.email}</TableCell>
                      <TableCell>
                        <Select value={u.role ?? ""} onValueChange={(v: Role) => setUserRole(u, v)}>
                          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Vælg" /></SelectTrigger>
                          <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={u.department_id ?? ""} onValueChange={(v) => setUserDept(u, v)}>
                          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Ingen" /></SelectTrigger>
                          <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">Ingen brugere.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <Card className="shadow-card">
            <CardHeader><CardTitle>Afdelinger</CardTitle><CardDescription>Tilføj eller fjern afdelinger.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="Navn på ny afdeling" onKeyDown={(e) => e.key === "Enter" && addDept()} />
                <Button onClick={addDept}><Plus className="mr-2 h-4 w-4" />Tilføj</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {departments.map((d) => (
                  <span key={d.id} className="inline-flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-sm">
                    {d.name}
                    <button onClick={() => removeDept(d.id)} className="text-muted-foreground hover:text-destructive">×</button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card className="shadow-card">
            <CardHeader><CardTitle>Adgangsregler</CardTitle><CardDescription>Sådan styres adgang i platformen.</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium">📌 Afdelings-scope</p>
                <p className="text-muted-foreground mt-1">En bruger ser kun processer i sin egen afdeling. Admins ser alt.</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium">🛡️ Roller</p>
                <ul className="text-muted-foreground mt-1 space-y-1 list-disc pl-5">
                  <li><b>Admin</b> – ser og redigerer alt</li>
                  <li><b>Process Owner</b> – kan publicere og redigere i egen afdeling</li>
                  <li><b>Editor</b> – kan redigere i egen afdeling</li>
                  <li><b>Viewer</b> – kun læseadgang</li>
                </ul>
              </div>
              <div className="rounded-lg border bg-accent/5 p-3">
                <p className="font-medium">🔐 Håndhæves i databasen</p>
                <p className="text-muted-foreground mt-1">Adgangskontrol er nu håndhævet i databasen — ikke kun i UI.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
