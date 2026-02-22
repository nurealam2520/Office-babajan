
-- Create team_requests table for team member request/accept flow
CREATE TABLE public.team_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

ALTER TABLE public.team_requests ENABLE ROW LEVEL SECURITY;

-- Users can create requests
CREATE POLICY "Users can create team requests"
ON public.team_requests FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

-- Users can view requests they sent or received
CREATE POLICY "Users can view own requests"
ON public.team_requests FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Users can update requests sent to them (accept/reject)
CREATE POLICY "Users can update received requests"
ON public.team_requests FOR UPDATE
USING (auth.uid() = to_user_id);

-- Users can delete their own sent requests
CREATE POLICY "Users can delete own requests"
ON public.team_requests FOR DELETE
USING (auth.uid() = from_user_id);

-- Admins can manage all requests
CREATE POLICY "Admins can manage all team requests"
ON public.team_requests FOR ALL
USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_team_requests_updated_at
BEFORE UPDATE ON public.team_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_requests;
