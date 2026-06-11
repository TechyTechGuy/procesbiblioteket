import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { Role, ROLES, ROLE_LABEL } from "@/lib/types";
import { Plus, Trash2, ShieldCheck, Lock, RotateCcw, Eye, EyeOff, Wand2, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UserRow {
  id: string;
  full_name: string;
  email: string | null;
  department_id: string | null;
  role: Role | null;
  deleted_at: string | null;
}

export default function Admin() {
  const { isAdmin, departments, refresh, user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [newDept, setNewDept] = useState("");

  // Create user modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("viewer");
  const [newDeptId, setNewDeptId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Delete dialog
  const [pendingDelete, setPendingDelete] = useState<UserRow | null>(null);

  // Reset password dialog
  const [pendingReset, setPendingReset] = useState<UserRow | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetting, setResetting] = useState(false);

  const loadUsers = async () => {
    const { data: profs } = await supabase.from("profiles").select("id, full_name, email, department_id, deleted_at");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const order: Role[] = ["admin", "process_owner", "editor", "viewer"];
    const rows: UserRow[] = (profs ?? []).map((p) => {
      const userRoles = (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as Role);
      const top = order.find((r) => userRoles.includes(r)) ?? null;
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        department_id: p.department_id,
        role: top,
        deleted_at: p.deleted_at ?? null,
      };
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

  // ---- Opret bruger ----
  const handleCreateUser = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    if (newPassword.length < 8) { toast.error("Password skal være mindst 8 tegn"); return; }
    setCreating(true);

    const { data, error } = await supabase.functions.invoke("admin-invite-user", {
      body: {
        email: newEmail.trim(),
        full_name: newName.trim(),
        role: newRole,
        department_id: newDeptId || null,
        password: newPassword,
      },
    });

    if (error || (data && (data as any).error)) {
      toast.error(error?.message || (data as any)?.error || "Kunne ikke oprette bruger");
      setCreating(false);
      return;
    }

    toast.success(`Bruger oprettet — del login med ${newEmail}`);
    setNewName("");
    setNewEmail("");
    setNewRole("viewer");
    setNewDeptId("");
    setNewPassword("");
    setShowPassword(false);
    setCreating(false);
    setCreateOpen(false);
    loadUsers();
  };

  // ---- Soft delete ----
  const handleSoftDelete = async (u: UserRow) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from("profiles").update({ deleted_at: now }).eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    // Fjern alle roller så brugeren mister adgang
    await supabase.from("user_roles").delete().eq("user_id", u.id);
    setUsers((arr) => arr.map((x) => x.id === u.id ? { ...x, deleted_at: now, role: null } : x));
    toast.success(`${u.full_name} er deaktiveret`);
  };

  // ---- Reactivate ----
  const handleReactivate = async (u: UserRow) => {
    const { error } = await supabase.from("profiles").update({ deleted_at: null }).eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("user_roles").delete().eq("user_id", u.id);
    const { error: rErr } = await supabase.from("user_roles").insert({ user_id: u.id, role: "viewer" });
    if (rErr) { toast.error(rErr.message); return; }
    setUsers((arr) => arr.map((x) => x.id === u.id ? { ...x, deleted_at: null, role: "viewer" } : x));
    toast.success(`${u.full_name} er genaktiveret som Viewer`);
  };

  // ---- Hard delete ----
  const handleHardDelete = async (u: UserRow) => {
    const { error } = await supabase.from("profiles").delete().eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("user_roles").delete().eq("user_id", u.id);
    setUsers((arr) => arr.filter((x) => x.id !== u.id));
    toast.success(`${u.full_name} er slettet permanent`);
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

  const isSoftDeleted = (u: UserRow) => !!u.deleted_at;

  const handleResetPassword = async () => {
    if (!pendingReset) return;
    if (resetPassword.length < 8) { toast.error("Password skal være mindst 8 tegn"); return; }
    setResetting(true);
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { user_id: pendingReset.id, password: resetPassword },
    });
    if (error || (data && (data as any).error)) {
      toast.error(error?.message || (data as any)?.error || "Kunne ikke nulstille password");
      setResetting(false);
      return;
    }
    toast.success(`Password nulstillet for ${pendingReset.full_name}`);
    setResetting(false);
    setPendingReset(null);
    setResetPassword("");
    setShowResetPw(false);
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
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Brugere</CardTitle>
                <CardDescription>Brugere oprettes ved selv at registrere sig på login-siden. Her kan du ændre rolle og afdeling.</CardDescription>
              </div>
              <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5 shrink-0">
                <Plus className="h-4 w-4" />Opret bruger
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Navn</TableHead><TableHead>Email</TableHead>
                  <TableHead>Rolle</TableHead><TableHead>Afdeling</TableHead>
                  <TableHead />
                </TableRow></TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className={isSoftDeleted(u) ? "opacity-50" : ""}>
                      <TableCell className="font-medium">
                        {u.full_name || "(uden navn)"}
                        {u.id === user?.id && <span className="ml-1 text-xs text-muted-foreground">(dig)</span>}
                        {isSoftDeleted(u) && (
                          <span className="ml-2 text-xs text-destructive border border-destructive/30 rounded px-1.5 py-0.5">
                            Deaktiveret
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{u.email}</TableCell>
                      <TableCell>
                        <Select
                          value={u.role ?? ""}
                          onValueChange={(v: Role) => setUserRole(u, v)}
                          disabled={isSoftDeleted(u)}
                        >
                          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Vælg" /></SelectTrigger>
                          <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.department_id ?? ""}
                          onValueChange={(v) => setUserDept(u, v)}
                          disabled={isSoftDeleted(u)}
                        >
                          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Ingen" /></SelectTrigger>
                          <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        {isSoftDeleted(u) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleReactivate(u)}
                            title="Fortryd deaktivering"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {!isSoftDeleted(u) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => { setPendingReset(u); setResetPassword(""); setShowResetPw(false); }}
                            title="Nulstil adgangskode"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingDelete(u)}
                          disabled={u.id === user?.id}
                          title={u.id === user?.id ? "Du kan ikke slette dig selv" : (isSoftDeleted(u) ? "Slet permanent" : "Deaktiver")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Ingen brugere.</TableCell></TableRow>
                  )}
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

      {/* ---- Opret bruger modal ---- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Opret ny bruger</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="new-name">Navn</Label>
              <Input id="new-name" placeholder="Fulde navn" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-email">Email</Label>
              <Input id="new-email" type="email" placeholder="bruger@eksempel.dk" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-pw">Password (min. 8 tegn)</Label>
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <Input
                    id="new-pw"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Sæt et midlertidigt password"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Skjul" : "Vis"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button type="button" variant="outline" size="icon" title="Generér password"
                  onClick={() => {
                    const bytes = new Uint8Array(12);
                    crypto.getRandomValues(bytes);
                    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
                    const pw = Array.from(bytes).map(b => chars[b % chars.length]).join("");
                    setNewPassword(pw); setShowPassword(true);
                  }}>
                  <Wand2 className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" title="Kopiér"
                  disabled={!newPassword}
                  onClick={() => {
                    navigator.clipboard.writeText(newPassword);
                    toast.success("Password kopieret");
                  }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Del password med brugeren — de kan selv ændre det under "Min konto" efter login.</p>
            </div>
            <div className="grid gap-1.5">
              <Label>Rolle</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Afdeling</Label>
              <Select value={newDeptId} onValueChange={setNewDeptId}>
                <SelectTrigger><SelectValue placeholder="Vælg afdeling" /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Annuller</Button>
            <Button onClick={handleCreateUser} disabled={creating || !newName || !newEmail || newPassword.length < 8}>
              {creating ? "Opretter..." : "Opret bruger"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Slet dialog ---- */}
      <AlertDialog open={!!pendingDelete} onOpenChange={() => setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete && isSoftDeleted(pendingDelete) ? "Slet permanent" : "Deaktiver bruger"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && isSoftDeleted(pendingDelete) ? (
                <><strong>{pendingDelete.full_name}</strong> er allerede deaktiveret. Slet permanent? Dette kan <strong>ikke fortrydes</strong>.</>
              ) : (
                <><strong>{pendingDelete?.full_name}</strong> mister adgang, men data bevares. Du kan slette permanent bagefter.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!pendingDelete) return;
                if (isSoftDeleted(pendingDelete)) {
                  await handleHardDelete(pendingDelete);
                } else {
                  await handleSoftDelete(pendingDelete);
                }
                setPendingDelete(null);
              }}
            >
              {pendingDelete && isSoftDeleted(pendingDelete) ? "Slet permanent" : "Deaktiver"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---- Nulstil password dialog ---- */}
      <Dialog open={!!pendingReset} onOpenChange={(o) => { if (!o) { setPendingReset(null); setResetPassword(""); setShowResetPw(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nulstil adgangskode</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <p className="text-sm text-muted-foreground">
              Sæt en ny adgangskode for <strong>{pendingReset?.full_name}</strong> ({pendingReset?.email}). Del den med brugeren — de kan selv ændre den under "Min konto".
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="reset-pw">Ny adgangskode (min. 8 tegn)</Label>
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <Input
                    id="reset-pw"
                    type={showResetPw ? "text" : "password"}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowResetPw((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showResetPw ? "Skjul" : "Vis"}>
                    {showResetPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button type="button" variant="outline" size="icon" title="Generér password"
                  onClick={() => {
                    const bytes = new Uint8Array(12);
                    crypto.getRandomValues(bytes);
                    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
                    const pw = Array.from(bytes).map(b => chars[b % chars.length]).join("");
                    setResetPassword(pw); setShowResetPw(true);
                  }}>
                  <Wand2 className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" title="Kopiér"
                  disabled={!resetPassword}
                  onClick={() => {
                    navigator.clipboard.writeText(resetPassword);
                    toast.success("Password kopieret");
                  }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingReset(null)} disabled={resetting}>Annuller</Button>
            <Button onClick={handleResetPassword} disabled={resetting || resetPassword.length < 8}>
              {resetting ? "Nulstiller..." : "Nulstil password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
