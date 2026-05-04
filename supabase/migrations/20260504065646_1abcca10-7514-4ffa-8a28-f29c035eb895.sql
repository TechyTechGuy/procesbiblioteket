
CREATE POLICY "delete versions admin or process owner"
ON public.process_versions FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'process_owner'::app_role)
);
