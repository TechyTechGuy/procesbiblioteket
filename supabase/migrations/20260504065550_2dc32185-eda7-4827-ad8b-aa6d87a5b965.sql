
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Update SELECT policy to hide soft-deleted from non-admins
DROP POLICY IF EXISTS "read processes by dept or admin" ON public.processes;
CREATE POLICY "read processes by dept or admin"
ON public.processes FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (department_id = user_department(auth.uid()) AND deleted_at IS NULL)
);
