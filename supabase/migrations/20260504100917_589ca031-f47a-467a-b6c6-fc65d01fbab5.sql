-- Add document-related columns to knowledge_items
ALTER TABLE public.knowledge_items
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_mime text,
  ADD COLUMN IF NOT EXISTS file_size_bytes integer,
  ADD COLUMN IF NOT EXISTS use_in_ai boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extracted_text text,
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'department',
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.knowledge_items
  DROP CONSTRAINT IF EXISTS knowledge_items_scope_check;
ALTER TABLE public.knowledge_items
  ADD CONSTRAINT knowledge_items_scope_check CHECK (scope IN ('global','department'));

CREATE INDEX IF NOT EXISTS idx_knowledge_items_active_ai
  ON public.knowledge_items (active, use_in_ai);

-- Update RLS: allow admin + process_owner to manage
DROP POLICY IF EXISTS "admin manages knowledge" ON public.knowledge_items;
DROP POLICY IF EXISTS "manage knowledge admin or owner" ON public.knowledge_items;

CREATE POLICY "manage knowledge admin or owner"
ON public.knowledge_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'process_owner'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'process_owner'));

-- Storage policies for knowledge documents in `uploads` bucket
DROP POLICY IF EXISTS "knowledge read uploads" ON storage.objects;
DROP POLICY IF EXISTS "knowledge insert uploads" ON storage.objects;
DROP POLICY IF EXISTS "knowledge update uploads" ON storage.objects;
DROP POLICY IF EXISTS "knowledge delete uploads" ON storage.objects;

CREATE POLICY "knowledge read uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = 'knowledge');

CREATE POLICY "knowledge insert uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = 'knowledge'
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'process_owner'))
);

CREATE POLICY "knowledge update uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = 'knowledge'
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'process_owner'))
);

CREATE POLICY "knowledge delete uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = 'knowledge'
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'process_owner'))
);