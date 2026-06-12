REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_department(uuid) FROM PUBLIC, anon;

DROP POLICY IF EXISTS "read knowledge by dept or all or admin" ON public.knowledge_items;
CREATE POLICY "read knowledge by dept or all or admin"
ON public.knowledge_items
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'process_owner'::public.app_role)
  OR (department_id IS NOT NULL AND department_id = public.user_department(auth.uid()))
);

DROP POLICY IF EXISTS "read versions if can read process" ON public.process_versions;
CREATE POLICY "read versions if can read process"
ON public.process_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.processes p
    WHERE p.id = process_versions.process_id
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR (
          p.deleted_at IS NULL
          AND (
            p.department_id = public.user_department(auth.uid())
            OR p.visible_to_all = true
            OR public.user_department(auth.uid()) = ANY (p.shared_department_ids)
          )
        )
      )
  )
);