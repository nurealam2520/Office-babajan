
-- 1. Profile fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS joining_date date,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Password reset requests table
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  mobile_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  otp_code text,
  approved_by uuid,
  approved_at timestamp with time zone,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create reset request" ON public.password_reset_requests;
CREATE POLICY "Anyone can create reset request"
ON public.password_reset_requests FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins view all reset requests" ON public.password_reset_requests;
CREATE POLICY "Admins view all reset requests"
ON public.password_reset_requests FOR SELECT
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "User views own reset request" ON public.password_reset_requests;
CREATE POLICY "User views own reset request"
ON public.password_reset_requests FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage reset requests" ON public.password_reset_requests;
CREATE POLICY "Admins manage reset requests"
ON public.password_reset_requests FOR UPDATE
USING (is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_password_reset_updated ON public.password_reset_requests;
CREATE TRIGGER trg_password_reset_updated
BEFORE UPDATE ON public.password_reset_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  created_by uuid NOT NULL,
  target_role text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All can view announcements" ON public.announcements;
CREATE POLICY "All can view announcements"
ON public.announcements FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Admins/Managers manage announcements" ON public.announcements;
CREATE POLICY "Admins/Managers manage announcements"
ON public.announcements FOR ALL
TO authenticated
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'manager'::app_role));

DROP TRIGGER IF EXISTS trg_announcements_updated ON public.announcements;
CREATE TRIGGER trg_announcements_updated
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Role hierarchy helper
CREATE OR REPLACE FUNCTION public.get_role_level(_role app_role)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _role
    WHEN 'super_admin' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'manager' THEN 3
    WHEN 'co_worker_data_entry' THEN 2
    WHEN 'co_worker' THEN 1
    WHEN 'member' THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_top_role_level(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(public.get_role_level(role)), 0)
  FROM public.user_roles
  WHERE user_id = _user_id;
$$;
