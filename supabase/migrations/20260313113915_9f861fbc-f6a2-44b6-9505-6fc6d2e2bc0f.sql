
-- Create activity_logs table for user and system logs
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  log_type text NOT NULL DEFAULT 'user',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Super admin can view all logs
CREATE POLICY "Super admins can view all logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Admin can view all logs except super_admin's
CREATE POLICY "Admins can view non-super-admin logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) 
  AND NOT has_role(activity_logs.user_id, 'super_admin'::app_role)
);

-- Anyone authenticated can insert logs (for their own actions)
CREATE POLICY "Users can insert own logs"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can insert logs for system events
CREATE POLICY "Admins can insert system logs"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- Update existing member roles to co_worker
UPDATE public.user_roles SET role = 'co_worker' WHERE role = 'member';

-- Enable realtime for activity_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
