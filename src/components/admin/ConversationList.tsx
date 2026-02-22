import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  user_id: string;
  full_name: string;
  username: string;
}

interface Props {
  userId: string;
  role: "super_admin" | "admin";
  profiles: Profile[];
  userRoles: Record<string, string[]>;
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  onNewMessage: () => void;
}

const ConversationList = ({ userId, role, profiles, userRoles, selectedUserId, onSelectUser, onNewMessage }: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [lastMessages, setLastMessages] = useState<Record<string, any>>({});

  const fetchLastMessages = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!data) return;

    const map: Record<string, any> = {};
    data.forEach(msg => {
      const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (otherId && !map[otherId]) {
        map[otherId] = msg;
      }
    });
    setLastMessages(map);
  }, [userId]);

  useEffect(() => { fetchLastMessages(); }, [fetchLastMessages]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("conv-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchLastMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLastMessages]);

  const getRoleLabel = (uid: string) => {
    const roles = userRoles[uid] || [];
    if (roles.includes("super_admin")) return "সুপার অ্যাডমিন";
    if (roles.includes("admin")) return "অ্যাডমিন";
    if (roles.includes("manager")) return "ম্যানেজার";
    return "মেম্বার";
  };

  // Filter conversations based on role rules
  const conversationUsers = profiles.filter(p => {
    if (p.user_id === userId) return false;
    const hasConversation = !!lastMessages[p.user_id];
    if (!hasConversation) return false;
    return true;
  });

  const filtered = conversationUsers.filter(p => {
    if (!searchQuery) return true;
    return p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Sort by last message time
  filtered.sort((a, b) => {
    const aMsg = lastMessages[a.user_id];
    const bMsg = lastMessages[b.user_id];
    if (!aMsg) return 1;
    if (!bMsg) return -1;
    return new Date(bMsg.created_at).getTime() - new Date(aMsg.created_at).getTime();
  });

  return (
    <div className="flex h-full flex-col border-r">
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="font-semibold text-foreground">কনভার্সেশন</h3>
        <Button size="icon" variant="ghost" onClick={onNewMessage}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="খুঁজুন..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            কোন কনভার্সেশন নেই
          </div>
        ) : (
          filtered.map(p => {
            const lastMsg = lastMessages[p.user_id];
            const isSelected = selectedUserId === p.user_id;
            return (
              <button
                key={p.user_id}
                onClick={() => onSelectUser(p.user_id)}
                className={`w-full text-left px-3 py-3 border-b transition-colors hover:bg-accent/50 ${
                  isSelected ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{p.full_name}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {getRoleLabel(p.user_id)}
                  </Badge>
                </div>
                {lastMsg && (
                  <>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {lastMsg.message_type === "voice" ? "🎤 ভয়েস মেসেজ" :
                       lastMsg.message_type === "image" ? "📷 ছবি" :
                       lastMsg.content || ""}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(lastMsg.created_at).toLocaleString("bn-BD")}
                    </p>
                  </>
                )}
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
