export type Role = "admin" | "process_owner" | "editor" | "viewer";
export type Status = "Draft" | "In Review" | "Published" | "Archived";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  process_owner: "Process Owner",
  editor: "Editor",
  viewer: "Viewer",
};

export const ROLES: Role[] = ["admin", "process_owner", "editor", "viewer"];
export const STATUSES: Status[] = ["Draft", "In Review", "Published", "Archived"];

export interface Department {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  active: boolean;
}

export interface ProcessVersion {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
  aiGenerated: boolean;
  notes?: string;
}

export interface Process {
  id: string;
  title: string;
  department_id: string;
  department_name: string;
  status: Status;
  owner_name: string;
  owner_id: string | null;
  tags: string[];
  content: string;
  qualityScore: number;
  updatedAt: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  type: string;
  department_id: string | null;
  department_name: string | null;
  content: string;
  active: boolean;
}