import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import forestHero from "@/assets/forest-hero.jpg";

export default function Auth() {
  const navigate = useNavigate();
  const { user, departments } = useAuth();
  const { brand } = useTheme();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupDept, setSignupDept] = useState<string>("");

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials"
        ? "Forkert email eller adgangskode"
        : error.message);
      return;
    }
    toast.success("Logget ind");
    navigate("/");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: signupName,
          department: signupDept || undefined,
        },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Email er allerede registreret — log ind i stedet");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Konto oprettet — tjek din email for at bekræfte");
  };

  const isSkov = brand === "skov";

  return (
    <div className="min-h-screen flex bg-gradient-subtle">
      {isSkov && (
        <div className="hidden lg:block relative w-1/2">
          <img
            src={forestHero}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/40" />
          <div className="relative z-10 flex h-full flex-col justify-end p-10">
            <h2 className="font-display text-4xl font-medium text-foreground max-w-md">
              Ét sted. Hver proces. Hele teamet — på samme side.
            </h2>
          </div>
        </div>
      )}
    <div className={`flex flex-1 items-center justify-center p-4 ${isSkov ? "lg:w-1/2" : ""}`}>
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[10px] shadow-elegant mb-2" style={{ backgroundColor: "#0F172A" }}>
            <span className="text-xl font-bold leading-none" style={{ color: "#E5E7EB", fontFamily: "Inter, system-ui, Arial, sans-serif" }}>PB</span>
          </div>
          <CardTitle>ProcesBiblioteket</CardTitle>
          <CardDescription>Log ind eller opret konto</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log ind</TabsTrigger>
              <TabsTrigger value="signup">Opret konto</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-3 mt-3">
                <div>
                  <Label htmlFor="li-email">Email</Label>
                  <Input id="li-email" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="li-pw">Adgangskode</Label>
                  <Input id="li-pw" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Logger ind..." : "Log ind"}</Button>
                <p className="text-xs text-center">
                  <Link to="/forgot-password" className="text-muted-foreground hover:text-primary">Glemt adgangskode?</Link>
                </p>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3 mt-3">
                <div>
                  <Label htmlFor="su-name">Fulde navn</Label>
                  <Input id="su-name" required value={signupName} onChange={(e) => setSignupName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="su-pw">Adgangskode (min. 6 tegn)</Label>
                  <Input id="su-pw" type="password" minLength={6} required value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} />
                </div>
                <div>
                  <Label>Afdeling (valgfri ved oprettelse)</Label>
                  <Select value={signupDept} onValueChange={setSignupDept}>
                    <SelectTrigger><SelectValue placeholder="Vælg afdeling" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Opretter..." : "Opret konto"}</Button>
                <p className="text-xs text-muted-foreground text-center">Du modtager en bekræftelses-email.</p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}