ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE POLICY "Managers can view all messages"
ON public.messages FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));