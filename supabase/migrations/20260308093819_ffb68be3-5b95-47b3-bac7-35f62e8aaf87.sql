
-- Payroll settings table (global config, single row)
CREATE TABLE public.payroll_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_start_time time NOT NULL DEFAULT '09:00:00',
  office_end_time time NOT NULL DEFAULT '18:00:00',
  weekly_off_day text NOT NULL DEFAULT 'friday',
  late_threshold_minutes integer NOT NULL DEFAULT 15,
  late_days_for_penalty integer NOT NULL DEFAULT 3,
  penalty_days_deducted integer NOT NULL DEFAULT 1,
  default_overtime_rate numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payroll settings" ON public.payroll_settings
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "All authenticated can view payroll settings" ON public.payroll_settings
  FOR SELECT TO authenticated
  USING (true);

-- Government holidays table
CREATE TABLE public.government_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date NOT NULL,
  name text NOT NULL,
  year integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(holiday_date)
);

ALTER TABLE public.government_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage holidays" ON public.government_holidays
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "All authenticated can view holidays" ON public.government_holidays
  FOR SELECT TO authenticated
  USING (true);

-- Add salary fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS basic_salary numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_rate_per_hour numeric NOT NULL DEFAULT 0;
