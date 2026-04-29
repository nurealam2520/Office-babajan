
-- 1. TASKS: add missing columns and relax status check
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_number text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS planned_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS budget numeric,
  ADD COLUMN IF NOT EXISTS credit_line text,
  ADD COLUMN IF NOT EXISTS t_security numeric,
  ADD COLUMN IF NOT EXISTS inputter_id uuid;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check CHECK (status IN (
    'pending','in_progress','completed','cancelled','issues','processing','ready_to_bid','bidded','resubmit'
  ));

-- 2. SHIFTS: new table
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shift_date date NOT NULL,
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  shift_type text NOT NULL DEFAULT 'morning',
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage shifts" ON public.shifts;
CREATE POLICY "Admins manage shifts" ON public.shifts
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Users view own shifts" ON public.shifts;
CREATE POLICY "Users view own shifts" ON public.shifts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin(auth.uid()) OR has_role(auth.uid(), 'manager'::app_role));

DROP TRIGGER IF EXISTS update_shifts_updated_at ON public.shifts;
CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. ATTENDANCE: add location/device columns
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS device_info text,
  ADD COLUMN IF NOT EXISTS ip_address text;

-- 4. PROFILES: temp_password viewable only by super_admin
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS temp_password text;

DROP POLICY IF EXISTS "Super admins can view passwords" ON public.profiles;
-- (covered by existing "Admins can view all profiles" but explicit super-admin select on temp_password isn't a column-level policy.
-- Existing row-level policy already lets admins see all profile rows; we restrict the column at the app layer + add super-admin-only column read via a security definer function.)

CREATE OR REPLACE FUNCTION public.get_user_temp_password(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pwd text;
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NULL;
  END IF;
  SELECT temp_password INTO _pwd FROM public.profiles WHERE user_id = _user_id;
  RETURN _pwd;
END;
$$;
