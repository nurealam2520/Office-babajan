import { useEffect, useState, useCallback } from "react";
import { Megaphone, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ConversationList from "./ConversationList";
import ChatView from "./ChatView";

interface Props {
  userId: string;
  role: "super_admin" | "admin";
}

const MessageSection = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Selected conversation
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // New message dialog
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [newMsgTo, setNewMsgTo] = useState("");

  // Broadcast
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState(role === "admin" ? "all_except_super" : "all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, username"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setProfiles(profs || []);
    const roleMap: Record<string, string[]> = {};
    (roles || []).forEach((r: any) => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });
    setUserRoles(roleMap);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const startNewConversation = () => {
    if (!newMsgTo) return;
    setSelectedUserId(newMsgTo);
    setNewMsgOpen(false);
    setNewMsgTo("");
  };

  const filteredRecipients = profiles.filter(p => {
    if (p.user_id === userId) return false;
    const pRoles = userRoles[p.user_id] || [];
    if (role === "super_admin") return true;
    if (role === "admin") return true;
    return !pRoles.includes("super_admin");
  });

  const selectedProfile = profiles.find(p => p.user_id === selectedUserId);

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">মেসেজ</h2>
        <Button size="sm" variant="secondary" onClick={() => setBroadcastOpen(true)} className="gap-2">
          <Megaphone className="h-4 w-4" /> ব্রডকাস্ট
        </Button>
      </div>

      {/* Chat Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] rounded-lg border bg-card overflow-hidden" style={{ height: "70vh" }}>
        {/* Conversation list */}
        <ConversationList
          userId={userId}
          role={role}
          profiles={profiles}
          userRoles={userRoles}
          selectedUserId={selectedUserId}
          onSelectUser={setSelectedUserId}
          onNewMessage={() => setNewMsgOpen(true)}
        />

        {/* Chat area */}
        <div className="flex flex-col">
          {selectedUserId && selectedProfile ? (
            <ChatView
              userId={userId}
              otherUserId={selectedUserId}
              otherUserName={selectedProfile.full_name}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <MessageSquare className="h-16 w-16" />
              <p>কনভার্সেশন সিলেক্ট করুন বা নতুন মেসেজ শুরু করুন</p>
              <Button size="sm" onClick={() => setNewMsgOpen(true)} className="gap-2">
                <MessageSquare className="h-4 w-4" /> নতুন মেসেজ
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New Message Dialog */}
      <Dialog open={newMsgOpen} onOpenChange={setNewMsgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>নতুন কনভার্সেশন</DialogTitle>
          </DialogHeader>
          <Select value={newMsgTo} onValueChange={setNewMsgTo}>
            <SelectTrigger>
              <SelectValue placeholder="প্রাপক নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {filteredRecipients.map(p => {
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
          <DialogFooter>
            <Button onClick={startNewConversation} disabled={!newMsgTo} className="gap-2">
              <MessageSquare className="h-4 w-4" /> শুরু করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
};

export default MessageSection;
