import { createContext, useContext, useState, ReactNode } from "react";
import { Process, User, KnowledgeItem, Role } from "./types";
import { initialProcesses, initialUsers, initialKnowledge, CURRENT_USER, DEPARTMENTS as DEFAULT_DEPTS } from "./mockData";

interface StoreCtx {
  currentUser: User;
  setCurrentUser: (u: User) => void;
  processes: Process[];
  setProcesses: React.Dispatch<React.SetStateAction<Process[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  knowledge: KnowledgeItem[];
  setKnowledge: React.Dispatch<React.SetStateAction<KnowledgeItem[]>>;
  departments: string[];
  setDepartments: React.Dispatch<React.SetStateAction<string[]>>;
  canSee: (p: Process) => boolean;
  canEdit: (p: Process) => boolean;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(CURRENT_USER);
  const [processes, setProcesses] = useState<Process[]>(initialProcesses);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>(initialKnowledge);
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPTS);

  const canSee = (p: Process) =>
    currentUser.role === "Admin" || p.department === currentUser.department;
  const canEdit = (p: Process) =>
    currentUser.role === "Admin" ||
    (p.department === currentUser.department && currentUser.role !== "Viewer");

  return (
    <Ctx.Provider value={{ currentUser, setCurrentUser, processes, setProcesses, users, setUsers, knowledge, setKnowledge, departments, setDepartments, canSee, canEdit }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be inside StoreProvider");
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