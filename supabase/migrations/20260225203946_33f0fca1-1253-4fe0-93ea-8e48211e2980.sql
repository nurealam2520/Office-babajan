
-- Create businesses table for multi-tenant support
CREATE TABLE public.businesses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  theme_color text DEFAULT '#3b82f6',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active businesses
CREATE POLICY "Authenticated users can view active businesses"
ON public.businesses FOR SELECT
TO authenticated
USING (is_active = true);

-- Only super_admin can manage businesses
CREATE POLICY "Super admins can manage businesses"
ON public.businesses FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add business_id to profiles (nullable for backward compatibility)
ALTER TABLE public.profiles ADD COLUMN business_id uuid REFERENCES public.businesses(id);

-- Create index for performance
CREATE INDEX idx_profiles_business_id ON public.profiles(business_id);

-- Insert the two businesses
INSERT INTO public.businesses (slug, name, theme_color) VALUES
  ('dorbar', 'দরবার - Dorbar', '#16a34a'),
  ('office', 'Office', '#2563eb');

-- Helper function to get user's business_id
CREATE OR REPLACE FUNCTION public.get_user_business_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM public.profiles WHERE user_id = _user_id
$$;

-- Trigger for updated_at
CREATE TRIGGER update_businesses_updated_at
BEFORE UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
