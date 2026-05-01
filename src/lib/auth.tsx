import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { Role, Department } from "./types";

interface Profile {
  id: string;
  full_name: string;
  department_id: string | null;
  email: string | null;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  departments: Department[];
  loading: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  myDepartmentName: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (uid: string) => {
    const [{ data: prof }, { data: roles }, { data: depts }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, department_id, email").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("departments").select("id, name").order("name"),
    ]);
    setProfile(prof ?? null);
    // Highest role wins (admin > process_owner > editor > viewer)
    const order: Role[] = ["admin", "process_owner", "editor", "viewer"];
    const userRoles = (roles ?? []).map((r) => r.role as Role);
    const top = order.find((r) => userRoles.includes(r)) ?? null;
    setRole(top);
    setDepartments(depts ?? []);
  };

  const refresh = async () => {
    if (user) await loadUserData(user.id);
  };

  useEffect(() => {
    // Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer DB calls
        setTimeout(() => loadUserData(sess.user.id), 0);
      } else {
        setProfile(null);
        setRole(null);
      }
    });
    // Then existing session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        loadUserData(sess.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = role === "admin";
  const canEdit = role === "admin" || role === "process_owner" || role === "editor";
  const myDepartmentName =
    departments.find((d) => d.id === profile?.department_id)?.name ?? null;

  return (
    <Ctx.Provider value={{ session, user, profile, role, departments, loading, isAdmin, canEdit, myDepartmentName, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}

export function scoreQuality(text: string): number {
  const t = (text || "").toLowerCase();
  const hints = ["formål", "scope", "roller", "trin", "input", "output", "sla", "kontrol", "risiko", "eskalering"];
  const found = hints.filter((k) => t.includes(k)).length;
  const hasBullets = /\n\s*[-•*]\s+/.test(text);
  const length = Math.min(40, Math.floor((text || "").length / 80));
  return Math.min(100, found * 6 + (hasBullets ? 10 : 0) + length);
}