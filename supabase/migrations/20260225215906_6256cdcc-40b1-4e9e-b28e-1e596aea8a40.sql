
-- Create attendance table for office users
CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  business_id uuid REFERENCES public.businesses(id),
  check_in timestamp with time zone NOT NULL DEFAULT now(),
  check_out timestamp with time zone,
  status text NOT NULL DEFAULT 'present',
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage all attendance"
ON public.attendance FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view all attendance"
ON public.attendance FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can view own attendance"
ON public.attendance FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attendance"
ON public.attendance FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attendance"
ON public.attendance FOR UPDATE
USING (auth.uid() = user_id);
