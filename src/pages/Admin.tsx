import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { ROLES } from "@/lib/mockData";
import { Role } from "@/lib/types";
import { Plus, Trash2, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const { users, setUsers, departments, setDepartments, currentUser } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", role: "Viewer" as Role, department: departments[0] });
  const [newDept, setNewDept] = useState("");

  if (currentUser.role !== "Admin") {
    return (
      <Card className="max-w-md mx-auto mt-12"><CardContent className="pt-6 text-center space-y-3">
        <Lock className="mx-auto h-10 w-10 text-warning" />
        <h2 className="font-semibold">Kun for administratorer</h2>
        <p className="text-sm text-muted-foreground">Skift bruger i topbaren til en med Admin-rolle for at se denne side.</p>
      </CardContent></Card>
    );
  }

  const addUser = () => {
    if (!draft.name || !draft.email) { toast.error("Udfyld navn og email"); return; }
    setUsers((u) => [...u, { id: `u_${Date.now()}`, ...draft, active: true }]);
    setDraft({ name: "", email: "", role: "Viewer", department: departments[0] });
    setOpen(false);
    toast.success("Bruger oprettet");
  };

  const addDept = () => {
    if (!newDept.trim()) return;
    if (departments.includes(newDept)) { toast.error("Findes allerede"); return; }
    setDepartments((d) => [...d, newDept.trim()]);
    setNewDept("");
    toast.success("Afdeling tilføjet");
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" />Brugere & adgang</h1>
        <p className="text-sm text-muted-foreground">Styr hvem der har adgang til hvilke processer — adgang er afgrænset pr. afdeling.</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Brugere ({users.length})</TabsTrigger>
          <TabsTrigger value="departments">Afdelinger ({departments.length})</TabsTrigger>
          <TabsTrigger value="rules">Adgangsregler</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="shadow-card">
            <CardHeader className="flex-row items-center justify-between">
              <div><CardTitle>Brugere</CardTitle><CardDescription>Rolle + afdeling bestemmer adgang.</CardDescription></div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Ny bruger</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Opret bruger</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Navn</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
                    <div><Label>Email</Label><Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Rolle</Label>
                        <Select value={draft.role} onValueChange={(v: Role) => setDraft({ ...draft, role: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Afdeling</Label>
                        <Select value={draft.department} onValueChange={(v) => setDraft({ ...draft, department: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={addUser}>Opret</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Navn</TableHead><TableHead>Email</TableHead>
                  <TableHead>Rolle</TableHead><TableHead>Afdeling</TableHead>
                  <TableHead>Aktiv</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{u.email}</TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(v: Role) => setUsers(arr => arr.map(x => x.id === u.id ? { ...x, role: v } : x))}>
                          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={u.department} onValueChange={(v) => setUsers(arr => arr.map(x => x.id === u.id ? { ...x, department: v } : x))}>
                          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Switch checked={u.active} onCheckedChange={(v) => setUsers(arr => arr.map(x => x.id === u.id ? { ...x, active: v } : x))} /></TableCell>
                      <TableCell>
                        {u.id !== currentUser.id && (
                          <Button size="icon" variant="ghost" onClick={() => setUsers(a => a.filter(x => x.id !== u.id))}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <Card className="shadow-card">
            <CardHeader><CardTitle>Afdelinger</CardTitle><CardDescription>Tilføj nye afdelinger som scope for processer og brugere.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="Navn på ny afdeling" onKeyDown={(e) => e.key === "Enter" && addDept()} />
                <Button onClick={addDept}><Plus className="mr-2 h-4 w-4" />Tilføj</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {departments.map((d) => (
                  <span key={d} className="inline-flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-sm">
                    {d}
                    <button onClick={() => setDepartments(arr => arr.filter(x => x !== d))} className="text-muted-foreground hover:text-destructive">×</button>
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
                <p className="font-medium">📌 Afdelings-scope (ABAC)</p>
                <p className="text-muted-foreground mt-1">En bruger ser kun processer hvor <code className="bg-background px-1 rounded">process.department == user.department</code>.</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium">🛡️ Roller</p>
                <ul className="text-muted-foreground mt-1 space-y-1 list-disc pl-5">
                  <li><b>Admin</b> – ser og redigerer alt på tværs af afdelinger</li>
                  <li><b>Process Owner</b> – kan publicere og redigere i egen afdeling</li>
                  <li><b>Editor</b> – kan redigere udkast i egen afdeling</li>
                  <li><b>Viewer</b> – kun læseadgang</li>
                </ul>
              </div>
              <div className="rounded-lg border bg-accent/5 p-3">
                <p className="font-medium">💡 Test det selv</p>
                <p className="text-muted-foreground mt-1">Brug "View as" i topbaren til at simulere andre brugere og se hvordan biblioteket ændrer sig.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}