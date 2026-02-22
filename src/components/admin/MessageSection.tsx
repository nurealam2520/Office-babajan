import { useEffect, useState, useCallback } from "react";
import { Send, Users, Megaphone, MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  role: "super_admin" | "admin";
}

const MessageSection = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState(role === "admin" ? "all_except_super" : "all");
  const [directOpen, setDirectOpen] = useState(false);
  const [directTo, setDirectTo] = useState("");
  const [directContent, setDirectContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: msgs }, { data: profs }, { data: roles }] = await Promise.all([
      supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("user_id, full_name, username"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setMessages(msgs || []);
    setProfiles(profs || []);
    // Build role map
    const roleMap: Record<string, string[]> = {};
    (roles || []).forEach(r => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });
    setUserRoles(roleMap);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        setMessages(prev => [payload.new as any, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getProfileName = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p ? p.full_name : uid.slice(0, 8);
  };

  const sendBroadcast = async () => {
    if (!broadcastContent.trim()) return;
    const { error } = await supabase.from("broadcast_messages").insert({
      sender_id: userId,
      content: broadcastContent,
      target_role: broadcastTarget,
    });
    if (error) {
      toast({ title: "ত্রুটি", description: "ব্রডকাস্ট পাঠাতে সমস্যা", variant: "destructive" });
    } else {
      toast({ title: "সফল", description: "ব্রডকাস্ট পাঠানো হয়েছে" });
      setBroadcastContent("");
      setBroadcastOpen(false);
    }
  };

  const sendDirectMessage = async () => {
    if (!directContent.trim() || !directTo) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: directTo,
      content: directContent,
      message_type: "text",
    });
    if (error) {
      toast({ title: "ত্রুটি", variant: "destructive" });
    } else {
      toast({ title: "সফল", description: "মেসেজ পাঠানো হয়েছে" });
      setDirectContent("");
      setDirectOpen(false);
    }
  };

  const filteredMessages = messages.filter(m => {
    if (!searchQuery) return true;
    const senderName = getProfileName(m.sender_id).toLowerCase();
    return senderName.includes(searchQuery.toLowerCase()) || m.content?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">মেসেজ ড্যাশবোর্ড</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setDirectOpen(true)} className="gap-2">
            <MessageSquare className="h-4 w-4" /> মেসেজ পাঠান
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setBroadcastOpen(true)} className="gap-2">
            <Megaphone className="h-4 w-4" /> ব্রডকাস্ট
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="মেসেজ খুঁজুন..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
      ) : filteredMessages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12" />
            <p>কোন মেসেজ নেই</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredMessages.map(msg => (
            <Card key={msg.id} className={msg.is_deleted_by_admin ? "opacity-50" : ""}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{getProfileName(msg.sender_id)}</span>
                    {msg.receiver_id && (
                      <>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-muted-foreground">{getProfileName(msg.receiver_id)}</span>
                      </>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {msg.message_type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{msg.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(msg.created_at).toLocaleString("bn-BD")}
                  </p>
                </div>
                {msg.is_deleted_by_admin && (
                  <Badge variant="destructive" className="text-xs">মুছে ফেলা হয়েছে</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Broadcast Dialog */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ব্রডকাস্ট মেসেজ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={broadcastTarget} onValueChange={setBroadcastTarget}>
              <SelectTrigger>
                <SelectValue placeholder="প্রাপক নির্বাচন" />
              </SelectTrigger>
              <SelectContent>
                {role === "super_admin" ? (
                  <>
                    <SelectItem value="all">সবাই</SelectItem>
                    <SelectItem value="member">শুধু মেম্বার</SelectItem>
                    <SelectItem value="manager">শুধু ম্যানেজার</SelectItem>
                    <SelectItem value="admin">শুধু অ্যাডমিন</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="all_except_super">সবাই (সুপার অ্যাডমিন ছাড়া)</SelectItem>
                    <SelectItem value="member">শুধু মেম্বার</SelectItem>
                    <SelectItem value="manager">শুধু ম্যানেজার</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="ব্রডকাস্ট মেসেজ লিখুন..."
              value={broadcastContent}
              onChange={e => setBroadcastContent(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button onClick={sendBroadcast} className="gap-2">
              <Send className="h-4 w-4" /> পাঠান
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Direct Message Dialog */}
      <Dialog open={directOpen} onOpenChange={setDirectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>মেসেজ পাঠান</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={directTo} onValueChange={setDirectTo}>
              <SelectTrigger>
                <SelectValue placeholder="প্রাপক নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                {profiles
                  .filter(p => {
                    const pRoles = userRoles[p.user_id] || [];
                    const isSuperAdmin = pRoles.includes("super_admin");
                    // Admin can message super_admin; but hide self
                    if (p.user_id === userId) return false;
                    // Admin role: can message anyone
                    if (role === "admin") return true;
                    // Super admin: can message anyone
                    if (role === "super_admin") return true;
                    return !isSuperAdmin; // fallback
                  })
                  .map(p => {
                    const pRoles = userRoles[p.user_id] || [];
                    const roleLabel = pRoles.includes("super_admin") ? "সুপার অ্যাডমিন" 
                      : pRoles.includes("admin") ? "অ্যাডমিন"
                      : pRoles.includes("manager") ? "ম্যানেজার" : "মেম্বার";
                    return (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.full_name} (@{p.username}) — {roleLabel}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="মেসেজ লিখুন..."
              value={directContent}
              onChange={e => setDirectContent(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button onClick={sendDirectMessage} className="gap-2">
              <Send className="h-4 w-4" /> পাঠান
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessageSection;
