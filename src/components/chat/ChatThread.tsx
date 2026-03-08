import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Props {
  userId: string;
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
}

interface Msg {
  id: string;
  content: string | null;
  sender_id: string;
  created_at: string;
}

const ChatThread = ({ userId, conversationId, otherUserName }: Props) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("id, content, sender_id, created_at")
      .eq("conversation_id", conversationId)
      .eq("is_deleted_by_admin", false)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Msg]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: trimmed,
      message_type: "text",
    });

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="border-b pb-2 mb-2">
        <p className="font-semibold text-sm">{otherUserName}</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 px-1 py-2">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[80%] rounded-lg px-3 py-2 text-sm",
              msg.sender_id === userId
                ? "ml-auto bg-primary text-primary-foreground"
                : "mr-auto bg-muted"
            )}
          >
            <p>{msg.content}</p>
            <p className={cn(
              "text-[10px] mt-0.5",
              msg.sender_id === userId ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              {format(new Date(msg.created_at), "HH:mm")}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t pt-2 flex gap-2">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button size="icon" onClick={sendMessage} disabled={!text.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatThread;
