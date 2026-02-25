
-- Add business_id to tasks table
ALTER TABLE public.tasks ADD COLUMN business_id uuid REFERENCES public.businesses(id);

-- Add business_id to collections table  
ALTER TABLE public.collections ADD COLUMN business_id uuid REFERENCES public.businesses(id);
