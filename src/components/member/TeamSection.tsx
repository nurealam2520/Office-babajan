import { useEffect, useState, useCallback } from "react";
import { Users, Plus, X, Search, UserCheck, Clock, Check, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  onTeamReady?: (teamIds: string[]) => void;
}

const TeamSection = ({ userId, onTeamReady }: Props) => {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingRequests, setPendingRequests] = useState<any[]>([]); // requests TO me
  const [sentRequests, setSentRequests] = useState<any[]>([]); // requests FROM me

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: team }, { data: profiles }, { data: roles }, { data: incoming }, { data: outgoing }] = await Promise.all([
      supabase.from("team_members").select("team_member_id").eq("user_id", userId),
      supabase.from("profiles").select("user_id, full_name, username"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("team_requests").select("*").eq("to_user_id", userId).eq("status", "pending"),
      supabase.from("team_requests").select("*").eq("from_user_id", userId).eq("status", "pending"),
    ]);

    const roleMap: Record<string, string[]> = {};
    (roles || []).forEach((r: any) => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });
    setUserRoles(roleMap);

    const teamIds = (team || []).map(t => t.team_member_id);
    const teamProfiles = (profiles || []).filter(p => teamIds.includes(p.user_id));
    setTeamMembers(teamProfiles);
    setAllProfiles(profiles || []);
    setPendingRequests(incoming || []);
    setSentRequests(outgoing || []);
    setLoading(false);

    if (onTeamReady) onTeamReady(teamIds);
  }, [userId, onTeamReady]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime for team requests
  useEffect(() => {
    const channel = supabase
      .channel(`team-requests-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_requests", filter: `to_user_id=eq.${userId}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "team_requests", filter: `from_user_id=eq.${userId}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchData]);

  const sendRequest = async (memberId: string) => {
    if (teamMembers.length >= 7) {
      toast({ title: "সর্বোচ্চ ৭ জন", description: "আপনি সর্বোচ্চ ৭ জন টিম মেম্বার যোগ করতে পারবেন", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("team_requests").insert({
      from_user_id: userId,
      to_user_id: memberId,
    });
    if (error) {
      if (error.code === "23505") {
        toast({ title: "রিকোয়েস্ট আগেই পাঠানো হয়েছে", variant: "destructive" });
      } else {
        toast({ title: "ত্রুটি", variant: "destructive" });
      }
    } else {
      // Send notification
      const myProfile = allProfiles.find(p => p.user_id === userId);
      await supabase.from("notifications").insert({
        user_id: memberId,
        title: "টিম রিকোয়েস্ট",
        message: `${myProfile?.full_name || "কেউ"} আপনাকে টিম মেম্বার হিসেবে যোগ করতে চায়`,
        type: "team_request",
      });
      toast({ title: "সফল", description: "রিকোয়েস্ট পাঠানো হয়েছে" });
      fetchData();
    }
  };

  const acceptRequest = async (request: any) => {
    // Check both users' team limits
    const { count: myTeamCount } = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const { count: theirTeamCount } = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("user_id", request.from_user_id);

    if ((myTeamCount || 0) >= 7 || (theirTeamCount || 0) >= 7) {
      toast({ title: "সর্বোচ্চ সীমা", description: "কোন একজনের টিম পূর্ণ", variant: "destructive" });
      return;
    }

    // Add both directions
    await supabase.from("team_members").insert([
      { user_id: request.from_user_id, team_member_id: userId },
      { user_id: userId, team_member_id: request.from_user_id },
    ]);

    // Update request status
    await supabase.from("team_requests").update({ status: "accepted" }).eq("id", request.id);

    // Notify requester
    const myProfile = allProfiles.find(p => p.user_id === userId);
    await supabase.from("notifications").insert({
      user_id: request.from_user_id,
      title: "রিকোয়েস্ট গ্রহণ",
      message: `${myProfile?.full_name || "কেউ"} আপনার টিম রিকোয়েস্ট গ্রহণ করেছেন`,
      type: "team_request_accepted",
    });

    toast({ title: "সফল", description: "টিম মেম্বার যোগ হয়েছে" });
    fetchData();
  };

  const rejectRequest = async (request: any) => {
    await supabase.from("team_requests").update({ status: "rejected" }).eq("id", request.id);
    toast({ title: "রিকোয়েস্ট বাতিল করা হয়েছে" });
    fetchData();
  };

  const removeMember = async (memberId: string) => {
    // Remove both directions
    await Promise.all([
      supabase.from("team_members").delete().eq("user_id", userId).eq("team_member_id", memberId),
      supabase.from("team_members").delete().eq("user_id", memberId).eq("team_member_id", userId),
    ]);
    toast({ title: "সরানো হয়েছে" });
    fetchData();
  };

  const cancelRequest = async (requestId: string) => {
    await supabase.from("team_requests").delete().eq("id", requestId);
    toast({ title: "রিকোয়েস্ট বাতিল" });
    fetchData();
  };

  const getRoleLabel = (uid: string) => {
    const roles = userRoles[uid] || [];
    if (roles.includes("super_admin")) return "সুপার অ্যাডমিন";
    if (roles.includes("admin")) return "অ্যাডমিন";
    if (roles.includes("manager")) return "ম্যানেজার";
    return "মেম্বার";
  };

  const getProfileName = (uid: string) => {
    const p = allProfiles.find(p => p.user_id === uid);
    return p ? p.full_name : "";
  };

  // Available members: not self, not already in team, not super_admin, no pending request
  const sentRequestIds = sentRequests.map(r => r.to_user_id);
  const incomingRequestIds = pendingRequests.map(r => r.from_user_id);
  const availableMembers = allProfiles.filter(p => {
    if (p.user_id === userId) return false;
    if (teamMembers.some(tm => tm.user_id === p.user_id)) return false;
    const roles = userRoles[p.user_id] || [];
    if (roles.includes("super_admin")) return false;
    if (sentRequestIds.includes(p.user_id)) return false;
    if (incomingRequestIds.includes(p.user_id)) return false;
    if (search && !p.full_name.toLowerCase().includes(search.toLowerCase()) && !p.username.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> আমার টিম
          <Badge variant="secondary">{teamMembers.length}/৭</Badge>
        </h2>
        {teamMembers.length < 7 && (
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> মেম্বার যোগ
          </Button>
        )}
      </div>

      {/* Pending requests TO me */}
      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> আগত রিকোয়েস্ট ({pendingRequests.length})
          </p>
          {pendingRequests.map(req => (
            <Card key={req.id} className="border-primary/30 bg-primary/5">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">{getProfileName(req.from_user_id).charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{getProfileName(req.from_user_id)}</p>
                    <p className="text-xs text-muted-foreground">টিম মেম্বার হতে চায়</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => acceptRequest(req)}>
                    <Check className="h-3 w-3" /> গ্রহণ
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => rejectRequest(req)}>
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sent pending requests */}
      {sentRequests.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> পাঠানো রিকোয়েস্ট ({sentRequests.length})
          </p>
          {sentRequests.map(req => (
            <Card key={req.id} className="opacity-70">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-semibold text-muted-foreground">{getProfileName(req.to_user_id).charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{getProfileName(req.to_user_id)}</p>
                    <p className="text-xs text-muted-foreground">অপেক্ষমাণ...</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => cancelRequest(req.id)}>
                  বাতিল
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {teamMembers.length === 0 && pendingRequests.length === 0 && sentRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Users className="h-12 w-12 opacity-30" />
            <p className="text-sm">এখনো কোন টিম মেম্বার নেই</p>
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> মেম্বার যোগ করুন
            </Button>
          </CardContent>
        </Card>
      ) : (
        teamMembers.length > 0 && (
          <div className="grid gap-2">
            {teamMembers.map(member => (
              <Card key={member.user_id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">{member.full_name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">@{member.username} · {getRoleLabel(member.user_id)}</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeMember(member.user_id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>টিম মেম্বার রিকোয়েস্ট পাঠান ({teamMembers.length}/৭)</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="নাম বা ইউজারনেম..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {availableMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">কোন মেম্বার পাওয়া যায়নি</p>
            ) : (
              availableMembers.map(p => (
                <div key={p.user_id} className="flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground">@{p.username} · {getRoleLabel(p.user_id)}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => sendRequest(p.user_id)}
                    disabled={teamMembers.length >= 7}>
                    রিকোয়েস্ট
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamSection;
