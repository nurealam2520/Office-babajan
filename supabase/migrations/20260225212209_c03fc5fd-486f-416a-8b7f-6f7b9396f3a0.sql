
-- Create junction table for multi-group assignment
CREATE TABLE public.user_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by uuid,
  UNIQUE(user_id, business_id)
);

-- Enable RLS
ALTER TABLE public.user_businesses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage user_businesses"
  ON public.user_businesses FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own businesses"
  ON public.user_businesses FOR SELECT
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_user_businesses_user_id ON public.user_businesses(user_id);
CREATE INDEX idx_user_businesses_business_id ON public.user_businesses(business_id);

-- Migrate existing profile business_id data to junction table
INSERT INTO public.user_businesses (user_id, business_id)
SELECT user_id, business_id FROM public.profiles
WHERE business_id IS NOT NULL
ON CONFLICT DO NOTHING;
