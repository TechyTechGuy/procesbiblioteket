import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";

export default function AccountSettings() {
  const { user, profile } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { toast.error("Password skal være mindst 8 tegn"); return; }
    if (pw !== pw2) { toast.error("De to passwords er ikke ens"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setPw(""); setPw2("");
    toast.success("Password opdateret");
  };

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><KeyRound className="h-6 w-6 text-primary" />Min konto</h1>
        <p className="text-sm text-muted-foreground">{profile?.full_name} · {user?.email}</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Skift password</CardTitle>
          <CardDescription>Vælg et nyt password (mindst 8 tegn).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label htmlFor="pw">Nyt password</Label>
              <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password" minLength={8} required />
            </div>
            <div>
              <Label htmlFor="pw2">Bekræft nyt password</Label>
              <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)}
                autoComplete="new-password" minLength={8} required />
            </div>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gem nyt password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
