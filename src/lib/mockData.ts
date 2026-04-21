import { Process, User, KnowledgeItem } from "./types";

export const DEPARTMENTS = ["Inkasso", "Finance", "Customer Service", "Operations", "Legal", "IT"];
export const ROLES = ["Admin", "Process Owner", "Editor", "Viewer"] as const;
export const STATUSES = ["Draft", "In Review", "Published", "Archived"] as const;

export const CURRENT_USER: User = {
  id: "u_me",
  name: "Theis Pedersen",
  email: "theis@firma.dk",
  role: "Admin",
  department: "Inkasso",
  active: true,
};

export const initialUsers: User[] = [
  CURRENT_USER,
  { id: "u_1", name: "Anna Berg", email: "anna@firma.dk", role: "Process Owner", department: "Finance", active: true },
  { id: "u_2", name: "Mikkel Holm", email: "mikkel@firma.dk", role: "Editor", department: "Inkasso", active: true },
  { id: "u_3", name: "Sara Lund", email: "sara@firma.dk", role: "Viewer", department: "Customer Service", active: true },
  { id: "u_4", name: "Jens Krog", email: "jens@firma.dk", role: "Editor", department: "Legal", active: false },
];

export const initialKnowledge: KnowledgeItem[] = [
  { id: "k1", title: "Proces skal indeholde formål, scope, roller og SLA", type: "Hard rule", department: "Alle", content: "Alle processer skal som minimum dokumentere formål, scope, ansvarlige roller (RACI) samt SLA.", active: true },
  { id: "k2", title: "Standardskabelon for procesdokument", type: "Skabelon", department: "Alle", content: "1. Formål\n2. Scope\n3. Roller (RACI)\n4. Trigger\n5. Trin-for-trin\n6. Inputs/Outputs\n7. Kontroller & risici\n8. SLA & KPI\n9. Eskalering", active: true },
  { id: "k3", title: "Inkassoproces – good example", type: "Eksempel", department: "Inkasso", content: "Eksempel på fuldt udfyldt inkassoproces med rykkertrin, gebyrgrænser og overdragelse til ekstern partner.", active: true },
  { id: "k4", title: "GDPR-krav til datahåndtering", type: "Hard rule", department: "Legal", content: "Personoplysninger skal slettes efter formålets ophør. Dokumentér retsgrundlag.", active: true },
];

const baseProcess = (id: string, title: string, department: string, status: any, owner: string, content: string, score: number, daysAgo: number): Process => {
  const date = new Date(Date.now() - daysAgo * 86400000).toISOString();
  return {
    id, title, department, status, owner,
    tags: [department.toLowerCase(), status.toLowerCase()],
    content,
    qualityScore: score,
    updatedAt: date,
    versions: [
      { id: `${id}_v1`, content, createdBy: owner, createdAt: date, aiGenerated: false, notes: "Første version" },
    ],
  };
};

export const initialProcesses: Process[] = [
  baseProcess("p1", "Rykkerproces – privatkunder", "Inkasso", "Published", "Mikkel Holm",
    "Formål: Sikre rettidig inddrivelse...\n\nTrin:\n- Send rykker 1 efter 10 dage\n- Send rykker 2 efter 20 dage\n- Overdrag til ekstern inkasso efter 45 dage\n\nSLA: Svar inden 5 hverdage.", 86, 2),
  baseProcess("p2", "Månedsafslutning bogholderi", "Finance", "In Review", "Anna Berg",
    "Procedure for månedsafslutning inkl. afstemninger og rapportering til ledelsen.", 72, 5),
  baseProcess("p3", "Onboarding ny medarbejder", "Operations", "Draft", "Theis Pedersen",
    "Udkast: vi mangler stadig at få beskrevet IT-setup, sikkerhedstræning og første-uges plan.", 48, 1),
  baseProcess("p4", "Klagehåndtering", "Customer Service", "Published", "Sara Lund",
    "End-to-end håndtering af kundeklager med eskaleringsmatrix.", 91, 12),
  baseProcess("p5", "Kontraktgennemgang", "Legal", "Draft", "Jens Krog",
    "Tjekliste til juridisk gennemgang af leverandøraftaler.", 55, 7),
  baseProcess("p6", "Adgangsstyring i kernesystemer", "IT", "Published", "Theis Pedersen",
    "Procedure for tildeling og fjernelse af adgange efter least-privilege princippet.", 88, 20),
];