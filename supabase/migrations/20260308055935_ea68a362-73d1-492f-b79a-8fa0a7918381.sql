
-- Create team_chats table
CREATE TABLE public.team_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.team_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage team chats" ON public.team_chats FOR ALL USING (public.is_admin(auth.uid()));

-- Create team_chat_members table
CREATE TABLE public.team_chat_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_chat_id UUID NOT NULL REFERENCES public.team_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.team_chat_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage team chat members" ON public.team_chat_members FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Members can view chat members" ON public.team_chat_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.team_chat_members tcm WHERE tcm.team_chat_id = team_chat_members.team_chat_id AND tcm.user_id = auth.uid())
);

-- Now add team_chats policy that references team_chat_members
CREATE POLICY "Members can view their team chats" ON public.team_chats FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.team_chat_members tcm WHERE tcm.team_chat_id = id AND tcm.user_id = auth.uid())
);

-- Add triggers
CREATE TRIGGER update_team_chats_updated_at BEFORE UPDATE ON public.team_chats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create documents storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT DO NOTHING;
