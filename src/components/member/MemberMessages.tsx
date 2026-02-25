import { useEffect, useState, useCallback } from "react";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ChatView from "@/components/admin/ChatView";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  userId: string;
  businessId?: string | null;
}

const MemberMessages = ({ userId, businessId }: Props) => {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [directMessageUsers, setDirectMessageUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const isMobile = useIsMobile();

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const [{ data: team }, { data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("team_members").select("team_member_id").eq("user_id", userId),
      supabase.from("profiles").select("user_id, full_name, username"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const teamIds = (team || []).map(t => t.team_member_id);
    const adminIds = (roles || []).filter((r: any) => r.role === "admin" || r.role === "super_admin").map((r: any) => r.user_id);
    const managerIds = (roles || []).filter((r: any) => r.role === "manager").map((r: any) => r.user_id);
    const upperLevelIds = [...new Set([...adminIds, ...managerIds])];

    const teamProfiles = (profiles || []).filter(p => teamIds.includes(p.user_id));
    const adminProfiles = (profiles || []).filter(p => adminIds.includes(p.user_id) && !teamIds.includes(p.user_id) && p.user_id !== userId);

    setTeamMembers(teamProfiles);
    setAdmins(adminProfiles);

    // Find upper-level users who have sent direct messages to this user (not in team, not already shown as admin)
    const { data: directMsgs } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", userId)
      .in("sender_id", upperLevelIds.filter(id => !teamIds.includes(id) && !adminIds.includes(id) && id !== userId));

    const dmUserIds = [...new Set((directMsgs || []).map(m => m.sender_id))];
    const dmProfiles = (profiles || []).filter(p => dmUserIds.includes(p.user_id));
    setDirectMessageUsers(dmProfiles);

    // Get unread counts
    const allContactIds = [...teamIds, ...adminIds.filter(id => id !== userId), ...dmUserIds];
    const { data: msgs } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", userId)
      .in("sender_id", allContactIds);

    const counts: Record<string, number> = {};
    (msgs || []).forEach((m: any) => {
      counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
    });
    setUnreadCounts(counts);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // Listen for new messages from upper-level users
  useEffect(() => {
    const channel = supabase
      .channel(`member-dm-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` }, () => {
        fetchContacts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchContacts]);

  const allContacts = [...teamMembers, ...admins, ...directMessageUsers];
  const selectedProfile = allContacts.find(p => p.user_id === selectedUserId);

  if (loading) return <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  // Mobile: show contact list or chat
  if (isMobile && selectedUserId && selectedProfile) {
    return (
      <div className="rounded-lg border bg-card overflow-hidden shadow-sm" style={{ height: "70vh" }}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b px-2 py-1.5 bg-muted/50">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedUserId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-[10px] font-semibold text-primary">{selectedProfile.full_name.charAt(0)}</span>
            </div>
            <h3 className="text-sm font-semibold">{selectedProfile.full_name}</h3>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatView userId={userId} otherUserId={selectedUserId} otherUserName={selectedProfile.full_name} hideHeader />
          </div>
        </div>
      </div>
    );
  }

  const ContactCard = ({ profile, label }: { profile: any; label?: string }) => (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => setSelectedUserId(profile.user_id)}
    >
      <CardContent className="py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">{profile.full_name.charAt(0)}</span>
          </div>
          <div>
            <p className="text-sm font-medium">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground">@{profile.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {label && <Badge variant="secondary" className="text-[10px]">{label}</Badge>}
          {unreadCounts[profile.user_id] && (
            <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
              {unreadCounts[profile.user_id]}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" /> মেসেজ
      </h2>

      {!isMobile && selectedUserId && selectedProfile ? (
        <div className="rounded-lg border bg-card overflow-hidden shadow-sm" style={{ height: "70vh" }}>
          <div className="grid h-full grid-cols-[250px_1fr]">
            {/* Contact list sidebar */}
            <div className="border-r overflow-y-auto p-2 space-y-1">
              {admins.map(p => (
                <div key={p.user_id}
                  className={`flex items-center gap-2 rounded-lg p-2 cursor-pointer text-sm ${selectedUserId === p.user_id ? "bg-primary/10" : "hover:bg-muted/50"}`}
                  onClick={() => setSelectedUserId(p.user_id)}>
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-primary">{p.full_name.charAt(0)}</span>
                  </div>
                  <span className="truncate">{p.full_name}</span>
                </div>
              ))}
              {directMessageUsers.map(p => (
                <div key={p.user_id}
                  className={`flex items-center gap-2 rounded-lg p-2 cursor-pointer text-sm ${selectedUserId === p.user_id ? "bg-primary/10" : "hover:bg-muted/50"}`}
                  onClick={() => setSelectedUserId(p.user_id)}>
                  <div className="h-6 w-6 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-accent-foreground">{p.full_name.charAt(0)}</span>
                  </div>
                  <span className="truncate">{p.full_name}</span>
                </div>
              ))}
              {teamMembers.map(p => (
                <div key={p.user_id}
                  className={`flex items-center gap-2 rounded-lg p-2 cursor-pointer text-sm ${selectedUserId === p.user_id ? "bg-primary/10" : "hover:bg-muted/50"}`}
                  onClick={() => setSelectedUserId(p.user_id)}>
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-primary">{p.full_name.charAt(0)}</span>
                  </div>
                  <span className="truncate">{p.full_name}</span>
                </div>
              ))}
            </div>
            {/* Chat view */}
            <ChatView userId={userId} otherUserId={selectedUserId} otherUserName={selectedProfile.full_name} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {teamMembers.length === 0 && admins.length === 0 && directMessageUsers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 opacity-30" />
                <p className="text-sm">প্রথমে টিম মেম্বার যোগ করুন</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {admins.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">অ্যাডমিন</p>
                  {admins.map(p => <ContactCard key={p.user_id} profile={p} label="অ্যাডমিন" />)}
                </div>
              )}
              {directMessageUsers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">ডাইরেক্ট মেসেজ</p>
                  {directMessageUsers.map(p => <ContactCard key={p.user_id} profile={p} label="ম্যানেজার" />)}
                </div>
              )}
              {teamMembers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">টিম মেম্বার</p>
                  {teamMembers.map(p => <ContactCard key={p.user_id} profile={p} />)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MemberMessages;
