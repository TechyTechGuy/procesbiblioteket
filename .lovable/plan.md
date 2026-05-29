# Plan

## 1. Gør theis.pedersen@3.dk til admin igen
Datafix via insert-tool: slet eksisterende rolle for brugeren og indsæt `admin`-rollen.

```sql
DELETE FROM user_roles WHERE user_id = (SELECT id FROM profiles WHERE email='theis.pedersen@3.dk');
INSERT INTO user_roles (user_id, role)
  SELECT id, 'admin' FROM profiles WHERE email='theis.pedersen@3.dk';
```

## 2. Admin opretter brugere direkte (uden invitation)
Erstat invitations-flowet med direkte oprettelse.

**Edge function** `admin-invite-user` (genbruges, men ændrer adfærd):
- Tilføj `password` til request-body (krav: min. 8 tegn).
- Skift fra `admin.auth.admin.inviteUserByEmail(...)` til `admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, department } })`.
- `email_confirm: true` betyder brugeren kan logge ind med det samme uden e-mailbekræftelse — men kun for brugere oprettet af admin.
- Resten (sætte rolle og afdeling efter oprettelse) bevares.

**UI** `src/pages/Admin.tsx`:
- Omdøb "Invitér bruger"-knap og dialog til "Opret bruger".
- Tilføj password-felt (med "vis/skjul"-toggle) og en lille "Generér"-knap der genererer et stærkt midlertidigt password admin kan kopiere.
- Validering: navn, e-mail, password (≥ 8 tegn), afdeling.
- Efter oprettelse: toast med "Bruger oprettet — del login-info med {email}".

## 3. Bruger kan selv ændre sit password efter login
Ny side `src/pages/AccountSettings.tsx` (route `/account`):
- Felter: nyt password + bekræft password (≥ 8 tegn, skal matche).
- Kalder `supabase.auth.updateUser({ password })`.
- Vises i sidebar-menuen for alle indloggede (nyt menupunkt "Min konto" i `AppSidebar.tsx`).
- Tilføj route i `App.tsx`.

## Sikkerhed
- Edge-funktionen tjekker stadig at kalderen er admin før `createUser` kaldes.
- Password sendes kun fra admin-UI → edge function (HTTPS) → Supabase Auth; gemmes aldrig i klart i nogen tabel.
- Slutbrugeren kan ændre sit password uden admin-mellemkomst via Supabase Auth's standard `updateUser`-API.

## Filer der ændres
- ny: `src/pages/AccountSettings.tsx`
- redigeres: `src/pages/Admin.tsx`, `src/components/layout/AppSidebar.tsx`, `src/App.tsx`, `supabase/functions/admin-invite-user/index.ts`
- data-fix: gør theis.pedersen@3.dk til admin
