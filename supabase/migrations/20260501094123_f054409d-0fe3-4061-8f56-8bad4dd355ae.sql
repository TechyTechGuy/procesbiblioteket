-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'process_owner', 'editor', 'viewer');
CREATE TYPE public.process_status AS ENUM ('Draft', 'In Review', 'Published', 'Archived');

-- Departments
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separate table)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Security definer: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Helper: get user's department id
CREATE OR REPLACE FUNCTION public.user_department(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE id = _user_id
$$;

-- Helper: any non-viewer role check
CREATE OR REPLACE FUNCTION public.can_edit(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','process_owner','editor')
  )
$$;

-- Processes
CREATE TABLE public.processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  status public.process_status NOT NULL DEFAULT 'Draft',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_name TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  quality_score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Process versions
CREATE TABLE public.process_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge items
CREATE TABLE public.knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uploads
CREATE TABLE public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT,
  original_text TEXT,
  title TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Storage bucket for uploads (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- Policies: departments
CREATE POLICY "auth read departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage departments" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Policies: profiles
CREATE POLICY "auth read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user updates own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admin updates any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin deletes profiles" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Policies: user_roles
CREATE POLICY "user reads own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin reads all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manages roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Policies: processes
CREATE POLICY "read processes by dept or admin" ON public.processes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR department_id = public.user_department(auth.uid()));
CREATE POLICY "insert processes in own dept (editors+)" ON public.processes FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR
    (public.can_edit(auth.uid()) AND department_id = public.user_department(auth.uid()))
  );
CREATE POLICY "update processes in own dept (editors+)" ON public.processes FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR
    (public.can_edit(auth.uid()) AND department_id = public.user_department(auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR
    (public.can_edit(auth.uid()) AND department_id = public.user_department(auth.uid()))
  );
CREATE POLICY "delete processes admin or owner" ON public.processes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'process_owner'));

-- Policies: process_versions
CREATE POLICY "read versions if can read process" ON public.process_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_id AND
    (public.has_role(auth.uid(),'admin') OR p.department_id = public.user_department(auth.uid()))));
CREATE POLICY "insert versions if can edit process" ON public.process_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_id AND
    (public.has_role(auth.uid(),'admin') OR
     (public.can_edit(auth.uid()) AND p.department_id = public.user_department(auth.uid())))));

-- Policies: knowledge_items
CREATE POLICY "read knowledge by dept or all or admin" ON public.knowledge_items FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR
    department_id IS NULL OR
    department_id = public.user_department(auth.uid())
  );
CREATE POLICY "admin manages knowledge" ON public.knowledge_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Policies: uploads
CREATE POLICY "read uploads in own dept or admin" ON public.uploads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR
         created_by = auth.uid() OR
         department_id = public.user_department(auth.uid()));
CREATE POLICY "insert uploads as self" ON public.uploads FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "delete own uploads or admin" ON public.uploads FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Storage policies for uploads bucket
CREATE POLICY "users read own files or admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'uploads' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')
  ));
CREATE POLICY "users upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_processes_updated BEFORE UPDATE ON public.processes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger on signup: create profile + grant role (auto-admin for theis.pedersen@3.dk)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _dept_id UUID;
  _full_name TEXT;
  _dept_name TEXT;
  _role public.app_role;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1));
  _dept_name := NEW.raw_user_meta_data->>'department';

  IF _dept_name IS NOT NULL AND length(trim(_dept_name)) > 0 THEN
    SELECT id INTO _dept_id FROM public.departments WHERE name = _dept_name;
    IF _dept_id IS NULL THEN
      INSERT INTO public.departments(name) VALUES (_dept_name) RETURNING id INTO _dept_id;
    END IF;
  END IF;

  INSERT INTO public.profiles(id, full_name, department_id, email)
  VALUES (NEW.id, _full_name, _dept_id, NEW.email);

  IF lower(NEW.email) = 'theis.pedersen@3.dk' THEN
    _role := 'admin';
  ELSE
    _role := 'viewer';
  END IF;

  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed default departments
INSERT INTO public.departments(name) VALUES
  ('Inkasso'),('Finance'),('Customer Service'),('Operations'),('Legal'),('IT')
ON CONFLICT (name) DO NOTHING;

-- Seed knowledge items (department_id NULL = all)
INSERT INTO public.knowledge_items(title, type, department_id, content, active) VALUES
  ('Proces skal indeholde formål, scope, roller og SLA','Hard rule', NULL, 'Alle processer skal som minimum dokumentere formål, scope, ansvarlige roller (RACI) samt SLA.', true),
  ('Standardskabelon for procesdokument','Skabelon', NULL, '1. Formål
2. Scope
3. Roller (RACI)
4. Trigger
5. Trin-for-trin
6. Inputs/Outputs
7. Kontroller & risici
8. SLA & KPI
9. Eskalering', true);
