
-- ASSETS table
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Other',
  status text NOT NULL DEFAULT 'available',
  assigned_to uuid,
  serial_number text,
  purchase_date date,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage assets" ON public.assets
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "All authenticated can view assets" ON public.assets
  FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER assets_set_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LEAVE TYPES
CREATE TABLE public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  days_allowed integer NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view leave types" ON public.leave_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage leave types" ON public.leave_types
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

INSERT INTO public.leave_types (name, days_allowed, is_paid) VALUES
  ('Casual Leave', 10, true),
  ('Sick Leave', 14, true),
  ('Annual Leave', 20, true),
  ('Unpaid Leave', 30, false);

-- LEAVE REQUESTS
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  leave_type_id uuid REFERENCES public.leave_types(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own leave" ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own leave" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own pending leave" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins/Managers view all leave" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins/Managers manage leave" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins delete leave" ON public.leave_requests
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE TRIGGER leave_requests_set_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
