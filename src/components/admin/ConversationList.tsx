import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Search, Plus, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Profile {
  user_id: string;
  full_name: string;
  username: string;
}

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager";
  profiles: Profile[];
  userRoles: Record<string, string[]>;
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  onNewMessage: () => void;
  showLocation?: boolean;
}

const ConversationList = ({ userId, role, profiles, userRoles, selectedUserId, onSelectUser, onNewMessage, showLocation = false }: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [lastMessages, setLastMessages] = useState<Record<string, any>>({});
  const [locationOpen, setLocationOpen] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);

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

  useEffect(() => {
    const channel = supabase
      .channel("conv-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchLastMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLastMessages]);

  const fetchLocations = async () => {
    const { data } = await supabase.from("user_locations").select("*");
    setLocations(data || []);
    setLocationOpen(true);
  };

  const getLocation = (uid: string) => locations.find(l => l.user_id === uid);

  const getRoleLabel = (uid: string) => {
    const roles = userRoles[uid] || [];
    if (roles.includes("super_admin")) return "সুপার অ্যাডমিন";
    if (roles.includes("admin")) return "অ্যাডমিন";
    if (roles.includes("manager")) return "ম্যানেজার";
    return "মেম্বার";
  };

  const getRoleBadgeClass = (uid: string) => {
    const roles = userRoles[uid] || [];
    if (roles.includes("super_admin")) return "bg-destructive/10 text-destructive border-destructive/20";
    if (roles.includes("admin")) return "bg-primary/10 text-primary border-primary/20";
    if (roles.includes("manager")) return "bg-accent/10 text-accent-foreground border-accent/20";
    return "bg-muted text-muted-foreground border-border";
  };

  const conversationUsers = profiles.filter(p => {
    if (p.user_id === userId) return false;
    return !!lastMessages[p.user_id];
  });

  const filtered = conversationUsers.filter(p => {
    if (!searchQuery) return true;
    return p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  filtered.sort((a, b) => {
    const aMsg = lastMessages[a.user_id];
    const bMsg = lastMessages[b.user_id];
    if (!aMsg) return 1;
    if (!bMsg) return -1;
    return new Date(bMsg.created_at).getTime() - new Date(aMsg.created_at).getTime();
  });

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "এইমাত্র";
    if (mins < 60) return `${mins}মি`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}ঘ`;
    return `${Math.floor(hrs / 24)}দি`;
  };

  return (
    <div className="flex h-full flex-col border-r bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">কনভার্সেশন</h3>
        <div className="flex items-center gap-1">
          {showLocation && (
            <Button size="icon" variant="ghost" onClick={fetchLocations} className="h-7 w-7">
              <MapPin className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onNewMessage} className="h-7 w-7">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="px-2 py-1.5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="খুঁজুন..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
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
                className={`w-full text-left px-3 py-2 border-b border-border/50 transition-all hover:bg-accent/30 ${
                  isSelected ? "bg-primary/10 border-l-2 border-l-primary" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-primary">
                        {p.full_name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-medium text-foreground truncate">{p.full_name}</span>
                      <span className="block text-[10px] text-muted-foreground">@{p.username}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${getRoleBadgeClass(p.user_id)}`}>
                      {getRoleLabel(p.user_id)}
                    </Badge>
                    {lastMsg && (
                      <span className="text-[9px] text-muted-foreground">
                        {timeAgo(lastMsg.created_at)}
                      </span>
                    )}
                  </div>
                </div>
                {lastMsg && (
                  <p className="mt-0.5 ml-8.5 text-[11px] text-muted-foreground truncate pl-[34px]">
                    {lastMsg.message_type === "voice" ? "🎤 ভয়েস" :
                     lastMsg.message_type === "image" ? "📷 ছবি" :
                     lastMsg.content?.slice(0, 40) || ""}
                  </p>
                )}
              </button>
            );
          })
        )}
      </ScrollArea>

      {/* Location Dialog */}
      <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">ইউজার লোকেশন</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {profiles.filter(p => p.user_id !== userId).map(p => {
              const loc = getLocation(p.user_id);
              return (
                <div key={p.user_id} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div>
                    <p className="text-xs font-medium">{p.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">@{p.username}</p>
                  </div>
                  <div className="text-right">
                    {loc ? (
                      <>
                        <Badge variant={loc.is_online ? "default" : "secondary"} className="text-[9px] px-1.5">
                          {loc.is_online ? "🟢 অনলাইন" : "⚫ অফলাইন"}
                        </Badge>
                        {loc.latitude && loc.longitude && (
                          <p className="mt-0.5 text-[9px] text-muted-foreground">
                            📍 {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">ডেটা নেই</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConversationList;
