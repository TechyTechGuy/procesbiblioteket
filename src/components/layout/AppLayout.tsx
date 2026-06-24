import { ReactNode, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogOut, Sun, Moon, Disc3 } from "lucide-react";
import { ROLE_LABEL } from "@/lib/types";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/lib/theme";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PartyOverlay } from "@/components/PartyOverlay";

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, role, signOut, myDepartmentName } = useAuth();
  const navigate = useNavigate();
  const { brand, mode, setBrand, toggleMode } = useTheme();
  const [partyOpen, setPartyOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-subtle">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b bg-background/80 backdrop-blur sticky top-0 z-10 px-3">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Platform til processtyring og adgangskontrol
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ToggleGroup
                type="single"
                value={brand}
                onValueChange={(v) => v && setBrand(v as "3" | "oister")}
                size="sm"
                className="hidden sm:flex"
              >
                <ToggleGroupItem value="3" className="h-7 px-2 text-xs">3</ToggleGroupItem>
                <ToggleGroupItem value="oister" className="h-7 px-2 text-xs">Oister</ToggleGroupItem>
              </ToggleGroup>
              <Button variant="ghost" size="icon" onClick={toggleMode} aria-label="Skift tema" className="h-8 w-8">
                {mode === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPartyOpen(true)}
                aria-label="Fest"
                className="h-8 w-8"
              >
                <Disc3 className="h-4 w-4" />
              </Button>
              {role && (
                <Badge variant="outline" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {ROLE_LABEL[role]}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground hidden md:inline">
                {profile?.full_name}
                {myDepartmentName && ` · ${myDepartmentName}`}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Log ud</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
      <PartyOverlay open={partyOpen} onClose={() => setPartyOpen(false)} />
    </SidebarProvider>
  );
}