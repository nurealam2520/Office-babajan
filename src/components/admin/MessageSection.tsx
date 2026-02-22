import { useEffect, useState, useCallback, useRef } from "react";
import { Megaphone, MessageSquare, Send, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ConversationList from "./ConversationList";
import ChatView from "./ChatView";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft } from "lucide-react";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager";
}

const MessageSection = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [newMsgTo, setNewMsgTo] = useState("");
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState(role === "super_admin" ? "all" : "all_except_super");

  // Voice broadcast
  const [broadcastRecording, setBroadcastRecording] = useState(false);
  const [broadcastMediaRecorder, setBroadcastMediaRecorder] = useState<MediaRecorder | null>(null);
  const broadcastChunksRef = useRef<Blob[]>([]);
  const [broadcastVoiceUrl, setBroadcastVoiceUrl] = useState<string | null>(null);

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

  const sendBroadcast = async () => {
    if (!broadcastContent.trim() && !broadcastVoiceUrl) return;
    const content = broadcastVoiceUrl
      ? `🎤 ভয়েস ব্রডকাস্ট${broadcastContent.trim() ? `\n${broadcastContent.trim()}` : ""}`
      : broadcastContent.trim();

    const { error } = await supabase.from("broadcast_messages").insert({
      sender_id: userId,
      content,
      target_role: broadcastTarget,
    });

    if (broadcastVoiceUrl) {
      // Also save as a message for voice playback
      await supabase.from("messages").insert({
        sender_id: userId,
        content,
        message_type: "voice",
        media_url: broadcastVoiceUrl,
        is_broadcast: true,
      });
    }

    if (error) {
      toast({ title: "ত্রুটি", description: "ব্রডকাস্ট পাঠাতে সমস্যা", variant: "destructive" });
    } else {
      // Send popup notifications to target users
      const targetUsers = profiles.filter(p => {
        if (p.user_id === userId) return false;
        const pRoles = userRoles[p.user_id] || [];
        if (broadcastTarget === "all") return true;
        if (broadcastTarget === "all_except_super") return !pRoles.includes("super_admin");
        if (broadcastTarget === "member") return !pRoles.includes("admin") && !pRoles.includes("super_admin") && !pRoles.includes("manager");
        if (broadcastTarget === "manager") return pRoles.includes("manager");
        if (broadcastTarget === "admin") return pRoles.includes("admin");
        return false;
      });

      for (const u of targetUsers) {
        const notifMessage = broadcastVoiceUrl
          ? `${content}\n[audio]${broadcastVoiceUrl}[/audio]`
          : content;
        await supabase.from("notifications").insert({
          user_id: u.user_id,
          title: "ব্রডকাস্ট মেসেজ",
          message: notifMessage,
          type: "broadcast",
        });
      }

      toast({ title: "সফল", description: "ব্রডকাস্ট পাঠানো হয়েছে" });
      setBroadcastContent("");
      setBroadcastVoiceUrl(null);
      setBroadcastOpen(false);
    }
  };

  const startBroadcastRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      broadcastChunksRef.current = [];
      recorder.ondataavailable = (e) => { broadcastChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(broadcastChunksRef.current, { type: "audio/webm" });
        const path = `${userId}/broadcast_${Date.now()}.webm`;
        const { error } = await supabase.storage.from("message-media").upload(path, blob);
        if (error) {
          toast({ title: "ত্রুটি", description: "ভয়েস আপলোড ব্যর্থ", variant: "destructive" });
          return;
        }
        const { data } = supabase.storage.from("message-media").getPublicUrl(path);
        setBroadcastVoiceUrl(data.publicUrl);
        toast({ title: "ভয়েস রেকর্ড হয়েছে" });
      };
      recorder.start();
      setBroadcastMediaRecorder(recorder);
      setBroadcastRecording(true);
    } catch {
      toast({ title: "ত্রুটি", description: "মাইক্রোফোন অ্যাক্সেস দিন", variant: "destructive" });
    }
  };

  const stopBroadcastRecording = () => {
    if (broadcastMediaRecorder) {
      broadcastMediaRecorder.stop();
      setBroadcastRecording(false);
      setBroadcastMediaRecorder(null);
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
  const showLocation = role === "super_admin" || role === "admin";
  const isMobile = useIsMobile();

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  // Mobile: show list OR chat; Desktop: two-column side by side
  const showMobileChat = isMobile && selectedUserId && selectedProfile;
  const showMobileList = isMobile && !selectedUserId;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">মেসেজ</h2>
        <Button size="sm" variant="secondary" onClick={() => setBroadcastOpen(true)} className="gap-2">
          <Megaphone className="h-4 w-4" /> ব্রডকাস্ট
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden shadow-sm" style={{ height: "70vh" }}>
        {isMobile ? (
          showMobileChat ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 border-b px-2 py-1.5 bg-muted/50">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedUserId(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-primary">{selectedProfile!.full_name.charAt(0)}</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">{selectedProfile!.full_name}</h3>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatView userId={userId} otherUserId={selectedUserId!} otherUserName={selectedProfile!.full_name} hideHeader />
              </div>
            </div>
          ) : (
            <ConversationList
              userId={userId} role={role} profiles={profiles} userRoles={userRoles}
              selectedUserId={selectedUserId} onSelectUser={setSelectedUserId}
              onNewMessage={() => setNewMsgOpen(true)} showLocation={showLocation}
            />
          )
        ) : (
          <div className="grid h-full grid-cols-[280px_1fr]">
            <ConversationList
              userId={userId} role={role} profiles={profiles} userRoles={userRoles}
              selectedUserId={selectedUserId} onSelectUser={setSelectedUserId}
              onNewMessage={() => setNewMsgOpen(true)} showLocation={showLocation}
            />
            <div className="flex flex-col">
              {selectedUserId && selectedProfile ? (
                <ChatView userId={userId} otherUserId={selectedUserId} otherUserName={selectedProfile.full_name} />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 opacity-30" />
                  <p className="text-sm">কনভার্সেশন সিলেক্ট করুন</p>
                  <Button size="sm" onClick={() => setNewMsgOpen(true)} className="gap-2 text-xs">
                    <MessageSquare className="h-3.5 w-3.5" /> নতুন মেসেজ
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
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
      <Dialog open={broadcastOpen} onOpenChange={o => { setBroadcastOpen(o); if (!o) { setBroadcastVoiceUrl(null); setBroadcastRecording(false); } }}>
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
              rows={3}
            />

            {/* Voice recording for broadcast */}
            <div className="flex items-center gap-2">
              {broadcastRecording ? (
                <Button size="sm" variant="destructive" onClick={stopBroadcastRecording} className="gap-2">
                  <Square className="h-3.5 w-3.5" /> রেকর্ড বন্ধ করুন
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={startBroadcastRecording} className="gap-2">
                  <Mic className="h-3.5 w-3.5" /> ভয়েস রেকর্ড
                </Button>
              )}
              {broadcastRecording && (
                <span className="text-xs text-destructive animate-pulse flex items-center gap-1">
                  <span>●</span> রেকর্ডিং...
                </span>
              )}
            </div>
            {broadcastVoiceUrl && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">রেকর্ড করা ভয়েস:</p>
                <audio controls src={broadcastVoiceUrl} className="w-full h-8" />
                <Button size="sm" variant="ghost" onClick={() => setBroadcastVoiceUrl(null)} className="text-xs h-6">
                  ভয়েস সরান
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={sendBroadcast} disabled={!broadcastContent.trim() && !broadcastVoiceUrl} className="gap-2">
              <Send className="h-4 w-4" /> পাঠান
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessageSection;
