import { useEffect, useRef, useState } from "react";
import { Send, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Props {
  userId: string;
  teamChatId: string;
  teamName: string;
}

interface Msg {
  id: string;
  content: string | null;
  sender_id: string;
  created_at: string;
  sender_name?: string;
}

const TeamChatThread = ({ userId, teamChatId, teamName }: Props) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    // Get members for profile lookup
    const { data: members } = await supabase
      .from("team_chat_members")
      .select("user_id")
      .eq("team_chat_id", teamChatId);

    const memberIds = members?.map(m => m.user_id) || [];
    setMemberCount(memberIds.length);

    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", memberIds);

    const profileMap = new Map(profs?.map(p => [p.user_id, p.full_name]) || []);
    setProfiles(profileMap);

    // Team messages use conversation_id = teamChatId pattern
    // We'll use receiver_id IS NULL and conversation_id = teamChatId for team messages
    const { data } = await supabase
      .from("messages")
      .select("id, content, sender_id, created_at")
      .eq("conversation_id", teamChatId)
      .eq("is_deleted_by_admin", false)
      .order("created_at", { ascending: true });

    setMessages(
      (data || []).map(m => ({
        ...m,
        sender_name: profileMap.get(m.sender_id) || "Unknown",
      }))
    );
  };

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`team-${teamChatId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${teamChatId}`,
      }, (payload) => {
        const newMsg = payload.new as Msg;
        newMsg.sender_name = profiles.get(newMsg.sender_id) || "Unknown";
        setMessages(prev => [...prev, newMsg]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [teamChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");

    await supabase.from("messages").insert({
      conversation_id: teamChatId,
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
      <div className="border-b pb-2 mb-2 flex items-center justify-between">
        <p className="font-semibold text-sm">{teamName}</p>
        <Badge variant="outline" className="text-[10px] gap-1">
          <Users className="h-3 w-3" /> {memberCount}
        </Badge>
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
            {msg.sender_id !== userId && (
              <p className="text-[10px] font-medium mb-0.5 text-muted-foreground">
                {msg.sender_name}
              </p>
            )}
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

export default TeamChatThread;
