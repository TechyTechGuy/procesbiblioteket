import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-sm text-muted-foreground">Indlæser...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}