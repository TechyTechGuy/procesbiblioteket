
DROP POLICY IF EXISTS "read knowledge by dept or all or admin" ON public.knowledge_items;
CREATE POLICY "read knowledge by dept or all or admin"
ON public.knowledge_items
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'process_owner'::app_role)
  OR scope = 'global'
  OR (department_id IS NOT NULL AND department_id = user_department(auth.uid()))
);

CREATE POLICY "update own uploads or admin"
ON public.uploads
FOR UPDATE
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
