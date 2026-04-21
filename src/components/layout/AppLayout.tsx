import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useStore } from "@/lib/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, setCurrentUser, users } = useStore();

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
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                {currentUser.role}
              </Badge>
              <span className="text-xs text-muted-foreground hidden md:inline">View as:</span>
              <Select
                value={currentUser.id}
                onValueChange={(id) => {
                  const u = users.find((x) => x.id === id);
                  if (u) setCurrentUser(u);
                }}
              >
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.name} · {u.role} · {u.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}