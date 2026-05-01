import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogOut } from "lucide-react";
import { ROLE_LABEL } from "@/lib/types";
import { useNavigate } from "react-router-dom";

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, role, signOut, myDepartmentName } = useAuth();
  const navigate = useNavigate();

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
    </SidebarProvider>
  );
}