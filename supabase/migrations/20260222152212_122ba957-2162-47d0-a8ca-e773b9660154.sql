
-- Allow managers to also manage user restrictions
DROP POLICY IF EXISTS "Admins can manage restrictions" ON public.user_restrictions;
CREATE POLICY "Admins and managers can manage restrictions"
ON public.user_restrictions
FOR ALL
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'manager'::app_role));

-- Allow managers to view all profiles (needed for user management)
CREATE POLICY "Managers can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));
