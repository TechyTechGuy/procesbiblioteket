
-- 1. knowledge_items SELECT: restrict to authenticated
DROP POLICY IF EXISTS "read knowledge by dept or all or admin" ON public.knowledge_items;
CREATE POLICY "read knowledge by dept or all or admin"
ON public.knowledge_items
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'process_owner'::app_role)
  OR (scope = 'global'::text)
  OR ((department_id IS NOT NULL) AND (department_id = user_department(auth.uid())))
);

-- 2. uploads UPDATE: restrict to authenticated
DROP POLICY IF EXISTS "update own uploads or admin" ON public.uploads;
CREATE POLICY "update own uploads or admin"
ON public.uploads
FOR UPDATE
TO authenticated
USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- 3. profiles UPDATE: prevent users from changing their own department_id
DROP POLICY IF EXISTS "user updates own profile" ON public.profiles;
CREATE POLICY "user updates own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND department_id IS NOT DISTINCT FROM (SELECT department_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. storage UPDATE policy for user-owned files outside knowledge/
CREATE POLICY "users update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'uploads'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
