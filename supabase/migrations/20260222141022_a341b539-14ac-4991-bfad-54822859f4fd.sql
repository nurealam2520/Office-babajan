
-- 1. Messages table for user-to-user and admin messaging
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID,
  conversation_id UUID,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice')),
  media_url TEXT,
  is_deleted_by_admin BOOLEAN NOT NULL DEFAULT false,
  is_broadcast BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can send messages" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Admins can view all messages" ON public.messages FOR SELECT
  USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update messages" ON public.messages FOR UPDATE
  USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete messages" ON public.messages FOR DELETE
  USING (is_admin(auth.uid()));

-- 2. Conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  blocked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Admins can view all conversations" ON public.conversations FOR SELECT
  USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update conversations" ON public.conversations FOR UPDATE
  USING (is_admin(auth.uid()));
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 3. Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_by UUID NOT NULL,
  assigned_to UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'resubmit')),
  admin_note TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL
  USING (is_admin(auth.uid()));
CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT
  USING (auth.uid() = assigned_to);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE
  USING (auth.uid() = assigned_to);

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Task reports table
CREATE TABLE public.task_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL,
  report_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'not_approved', 'resubmit')),
  admin_feedback TEXT,
  pdf_url TEXT,
  report_number SERIAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reports" ON public.task_reports FOR ALL
  USING (is_admin(auth.uid()));
CREATE POLICY "Users can view own reports" ON public.task_reports FOR SELECT
  USING (auth.uid() = submitted_by);
CREATE POLICY "Users can submit reports" ON public.task_reports FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Users can update own reports" ON public.task_reports FOR UPDATE
  USING (auth.uid() = submitted_by);

CREATE TRIGGER update_task_reports_updated_at
  BEFORE UPDATE ON public.task_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. User restrictions table (ban, restrict, delete)
CREATE TABLE public.user_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  restriction_type TEXT NOT NULL CHECK (restriction_type IN ('ban', 'restrict', 'delete')),
  reason TEXT,
  restricted_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage restrictions" ON public.user_restrictions FOR ALL
  USING (is_admin(auth.uid()));
CREATE POLICY "Users can view own restrictions" ON public.user_restrictions FOR SELECT
  USING (auth.uid() = user_id);

-- 6. Blocked numbers (permanently blocked from re-registration)
CREATE TABLE public.blocked_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '+880',
  blocked_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mobile_number, country_code)
);

ALTER TABLE public.blocked_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only super admins can manage blocked numbers" ON public.blocked_numbers FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- 7. User locations table
CREATE TABLE public.user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update own location" ON public.user_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can upsert own location" ON public.user_locations FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can view own location" ON public.user_locations FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all locations" ON public.user_locations FOR SELECT
  USING (is_admin(auth.uid()));

CREATE TRIGGER update_user_locations_updated_at
  BEFORE UPDATE ON public.user_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Broadcast messages
CREATE TABLE public.broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  target_role TEXT CHECK (target_role IN ('all', 'member', 'manager', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can create broadcasts" ON public.broadcast_messages FOR INSERT
  WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Anyone can view broadcasts" ON public.broadcast_messages FOR SELECT
  USING (true);

-- Enable realtime for messages and locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_messages;
