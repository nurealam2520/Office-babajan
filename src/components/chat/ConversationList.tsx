import { useEffect, useState } from "react";
import { Search, Plus, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Props {
  userId: string;
  role: string;
  onSelect: (conversationId: string, otherUserId: string, otherUserName: string) => void;
}

interface ConvItem {
  id: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage: string;
  lastMessageAt: string;
}

const ConversationList = ({ userId, role, onSelect }: Props) => {
  const [conversations, setConversations] = useState<ConvItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [users, setUsers] = useState<{ user_id: string; full_name: string }[]>([]);
  const [userSearch, setUserSearch] = useState("");

  const fetchConversations = async () => {
    setLoading(true);
    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (!convs || convs.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const otherIds = convs.map(c => c.user1_id === userId ? c.user2_id : c.user1_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", otherIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    // Get last message for each conversation
    const items: ConvItem[] = [];
    for (const conv of convs) {
      const otherId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      items.push({
        id: conv.id,
        otherUserId: otherId,
        otherUserName: profileMap.get(otherId) || "Unknown",
        lastMessage: lastMsg?.content || "No messages yet",
        lastMessageAt: lastMsg?.created_at || conv.created_at,
      });
    }

    items.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    setConversations(items);
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, [userId]);

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .neq("user_id", userId)
      .eq("is_active", true);
    setUsers(data || []);
  };

  const startConversation = async (otherUserId: string, otherUserName: string) => {
    // Check existing
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user1_id.eq.${userId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${userId})`)
      .maybeSingle();

    if (existing) {
      setNewChatOpen(false);
      onSelect(existing.id, otherUserId, otherUserName);
      return;
    }

    const { data: newConv } = await supabase
      .from("conversations")
      .insert({ user1_id: userId, user2_id: otherUserId })
      .select()
      .single();

    if (newConv) {
      setNewChatOpen(false);
      onSelect(newConv.id, otherUserId, otherUserName);
    }
  };

  const filtered = conversations.filter(c =>
    c.otherUserName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Dialog open={newChatOpen} onOpenChange={(o) => { setNewChatOpen(o); if (o) loadUsers(); }}>
          <DialogTrigger asChild>
            <Button size="icon"><Plus className="h-4 w-4" /></Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Conversation</DialogTitle>
            </DialogHeader>
            <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {users
                .filter(u => u.full_name.toLowerCase().includes(userSearch.toLowerCase()))
                .map(u => (
                  <Button
                    key={u.user_id}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => startConversation(u.user_id, u.full_name)}
                  >
                    {u.full_name}
                  </Button>
                ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No conversations yet</p>
        </div>
      ) : (
        filtered.map(c => (
          <Card
            key={c.id}
            className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => onSelect(c.id, c.otherUserId, c.otherUserName)}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{c.otherUserName}</p>
                <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                {formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true })}
              </span>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

export default ConversationList;
