## Mål

Gøre prototypen til en rigtig app med login og permanent lagring, så uploads, processer, viden og admin-ændringer gemmes pr. bruger med korrekt adgangskontrol baseret på afdeling og rolle.

## Hvad du får

- **Login med email + adgangskode** (email-bekræftelse påkrævet)
- **theis.pedersen@3.dk** bliver automatisk admin første gang den registreres
- **Profil pr. bruger**: navn, afdeling, rolle (Admin, Process Owner, Editor, Viewer)
- **Permanent lagring** af processer, uploads, viden, afdelinger og brugere
- **Rigtig adgangskontrol** håndhævet i databasen (ikke kun i UI)
- **"View as"-funktionen** fjernes — adgang styres nu af den indloggede brugers rolle og afdeling

## Implementeringstrin

1. **Aktivér Lovable Cloud** (database + auth + storage)
2. **Database-skema**:
   - `departments` (id, navn)
   - `profiles` (user_id, navn, department_id) — auto-oprettes ved signup via trigger
   - `user_roles` (user_id, role) — separat tabel pga. sikkerhed; rolle-enum: admin/process_owner/editor/viewer
   - `processes` (id, titel, indhold, department_id, status, kvalitetsscore, owner, versions…)
   - `process_versions` (id, process_id, indhold, ændret_af, tidspunkt)
   - `knowledge_items` (id, type, titel, indhold, department_id)
   - `uploads` (id, fil-sti, original-tekst, oprettet_af) + storage-bucket til filer
3. **RLS-policies** (row-level sikkerhed) baseret på `has_role()` security-definer-funktion:
   - Admin ser alt
   - Andre roller ser kun data fra egen afdeling
   - Editor/Process Owner kan redigere; Viewer kan kun læse
4. **Auto-admin-trigger**: Ved signup tjekkes om email = `theis.pedersen@3.dk` → tildeles admin-rolle, ellers viewer
5. **Auth-sider**: `/auth` (login + signup), `/reset-password`, ProtectedRoute-wrapper
6. **Refaktor af eksisterende sider** så de læser/skriver til Cloud i stedet for mockData:
   - Dashboard, Library, ProcessDetail, UploadImprove, Knowledge, Admin
7. **Admin-side opgraderes**: rigtig brugeradministration (skift rolle, skift afdeling, slet bruger), opret/slet afdelinger
8. **Header**: "View as"-vælger fjernes; viser nu indlogget bruger + logout-knap
9. **Email-bekræftelse**: Standard Lovable-emails bruges (ingen custom domain nødvendig nu)

## Tekniske noter

- Roller gemmes i separat `user_roles`-tabel (ikke på profile) for at undgå privilege escalation
- `has_role(user_id, role)` som SECURITY DEFINER-funktion bruges i alle RLS-policies for at undgå rekursion
- `onAuthStateChange` sættes op før `getSession()` i auth-context
- Uploads: filer i Storage-bucket, metadata i `uploads`-tabel
- Mock data bevares som seed-script så Library ikke er tom ved første login

## Hvad der ikke ændres

- Designet og UI-strukturen
- Flowet i Upload & Improve (stadig simuleret AI — ægte AI er et senere skridt)
- Sidernes layout og navigation