
CREATE TABLE public.payrolls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_by uuid NOT NULL,
  month text NOT NULL,
  basic_salary numeric NOT NULL DEFAULT 0,
  housing_allowance numeric NOT NULL DEFAULT 0,
  transport_allowance numeric NOT NULL DEFAULT 0,
  medical_allowance numeric NOT NULL DEFAULT 0,
  other_allowances numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  overtime_hours numeric NOT NULL DEFAULT 0,
  overtime_rate numeric NOT NULL DEFAULT 0,
  tax_deduction numeric NOT NULL DEFAULT 0,
  loan_deduction numeric NOT NULL DEFAULT 0,
  advance_deduction numeric NOT NULL DEFAULT 0,
  penalty_deduction numeric NOT NULL DEFAULT 0,
  other_deductions numeric NOT NULL DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamp with time zone,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all payrolls" ON public.payrolls
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own payrolls" ON public.payrolls
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
