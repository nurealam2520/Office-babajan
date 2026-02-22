
CREATE POLICY "Managers can view all collections"
ON public.collections
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));
