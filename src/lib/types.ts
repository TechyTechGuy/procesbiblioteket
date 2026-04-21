export type Role = "Admin" | "Process Owner" | "Editor" | "Viewer";
export type Status = "Draft" | "In Review" | "Published" | "Archived";

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
  department: string;
  status: Status;
  owner: string;
  tags: string[];
  content: string;
  versions: ProcessVersion[];
  qualityScore: number;
  updatedAt: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  type: "Hard rule" | "Skabelon" | "Eksempel";
  department: string | "Alle";
  content: string;
  active: boolean;
}