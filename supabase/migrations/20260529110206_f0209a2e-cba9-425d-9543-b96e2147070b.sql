
ALTER TABLE public.processes
  ADD COLUMN IF NOT EXISTS shared_department_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visible_to_all boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "read processes by dept or admin" ON public.processes;

CREATE POLICY "read processes by dept shared or admin"
ON public.processes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    deleted_at IS NULL
    AND (
      department_id = user_department(auth.uid())
      OR visible_to_all = true
      OR user_department(auth.uid()) = ANY(shared_department_ids)
    )
  )
);
