import { useEffect, useState, useCallback } from "react";
import { Ban, Trash2, ShieldOff, Search, Eye, MessageSquareOff, Clock, ArrowLeft, Info, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager";
}

const DURATION_OPTIONS = [
  { value: "1h", label: "1 Hour" },
  { value: "6h", label: "6 Hours" },
  { value: "24h", label: "24 Hours" },
  { value: "3d", label: "3 Days" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "permanent", label: "Permanent" },
];

const getDurationMs = (val: string): number | null => {
  switch (val) {
    case "1h": return 3600000;
    case "6h": return 21600000;
    case "24h": return 86400000;
    case "3d": return 259200000;
    case "7d": return 604800000;
    case "30d": return 2592000000;
    default: return null;
  }
};

const RESTRICTION_INFO = [
  {
    type: "restrict",
    icon: MessageSquareOff,
    title: "Restrict",
    color: "text-accent-foreground",
    bgColor: "bg-accent/10",
    description: "Cannot message (except admin)",
    allowed: ["✅ View and complete tasks", "✅ Submit reports", "✅ Contact admin only"],
    blocked: ["❌ Message other members", "❌ Send broadcasts"],
  },
  {
    type: "ban",
    icon: Ban,
    title: "Ban",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    description: "Can only view the app, cannot perform any action",
    allowed: ["✅ Open the app", "✅ View dashboard"],
    blocked: ["❌ Send messages", "❌ Complete tasks", "❌ Submit reports", "❌ Perform any action"],
  },
];

const UserManagementSection = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [restrictions, setRestrictions] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("all");
  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: string; user: any | null }>({
    open: false, type: "", user: null,
  });
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("24h");
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [conversationDialog, setConversationDialog] = useState<{ open: boolean; user: any | null }>({
    open: false, user: null,
  });
  const [userMessages, setUserMessages] = useState<any[]>([]);
  const [infoOpen, setInfoOpen] = useState(false);
  const [groupDialog, setGroupDialog] = useState<{ open: boolean; user: any | null }>({ open: false, user: null });
  const [userGroupIds, setUserGroupIds] = useState<string[]>([]);
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [savingGroups, setSavingGroups] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: r }, { data: roles }, { data: biz }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_restrictions").select("*").eq("is_active", true),
      supabase.from("user_roles").select("*"),
      supabase.from("businesses").select("id, name").eq("is_active", true),
    ]);
    setProfiles(p || []);
    setRestrictions(r || []);
    setUserRoles(roles || []);
    setBusinesses(biz || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getRestriction = (uid: string) => restrictions.find(r => r.user_id === uid);

  const getUserRole = (uid: string): string => {
    const r = userRoles.find(r => r.user_id === uid);
    return r?.role || "member";
  };

  const isProtectedFromAction = (uid: string) => {
    const targetRole = getUserRole(uid);
    if (targetRole === "super_admin") return true;
    if (targetRole === "admin" && role !== "super_admin") return true;
    return false;
  };

  const applyRestriction = async (type: string, targetUser: any) => {
    const durationMs = getDurationMs(duration);
    const expiresAt = durationMs ? new Date(Date.now() + durationMs).toISOString() : null;

    const { error } = await supabase.from("user_restrictions").insert({
      user_id: targetUser.user_id,
      restriction_type: type,
      reason: reason || null,
      restricted_by: userId,
      expires_at: expiresAt,
    });

    if (type === "ban" || type === "delete") {
      await supabase.from("profiles").update({ is_active: false }).eq("user_id", targetUser.user_id);
    }

    if (type === "delete" && role === "super_admin") {
      await supabase.from("blocked_numbers").insert({
        mobile_number: targetUser.mobile_number,
        country_code: targetUser.country_code,
        blocked_by: userId,
        reason: reason || null,
      });
    }

    if (error) {
      toast({ title: "Error", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `User ${type === "ban" ? "banned" : type === "restrict" ? "restricted" : "deleted"}` });
      setActionDialog({ open: false, type: "", user: null });
      setReason("");
      setDuration("24h");
      fetchData();
    }
  };

  const removeRestriction = async (restrictionId: string) => {
    await supabase.from("user_restrictions").update({ is_active: false }).eq("id", restrictionId);
    toast({ title: "Success", description: "Restriction removed" });
    fetchData();
  };

  const openGroupDialog = async (user: any) => {
    setGroupDialog({ open: true, user });
    const { data } = await supabase
      .from("user_businesses")
      .select("business_id")
      .eq("user_id", user.user_id);
    setUserGroupIds(data?.map(d => d.business_id) || []);
  };

  const toggleGroup = (bizId: string) => {
    setUserGroupIds(prev => prev.includes(bizId) ? prev.filter(id => id !== bizId) : [...prev, bizId]);
  };

  const saveGroups = async () => {
    if (!groupDialog.user) return;
    setSavingGroups(true);
    const uid = groupDialog.user.user_id;

    await supabase.from("user_businesses").delete().eq("user_id", uid);

    if (userGroupIds.length > 0) {
      await supabase.from("user_businesses").insert(
        userGroupIds.map(bizId => ({ user_id: uid, business_id: bizId, assigned_by: userId }))
      );
      await supabase.from("profiles").update({ business_id: userGroupIds[0] }).eq("user_id", uid);
    }

    setSavingGroups(false);
    setGroupDialog({ open: false, user: null });
    toast({ title: "Success", description: "Groups updated" });
  };

  const viewConversations = async (user: any) => {
    setConversationDialog({ open: true, user });
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.user_id},receiver_id.eq.${user.user_id}`)
      .order("created_at", { ascending: false })
      .limit(50);
    setUserMessages(msgs || []);
  };

  const deleteMessage = async (msgId: string) => {
    await supabase.from("messages").update({ is_deleted_by_admin: true }).eq("id", msgId);
    toast({ title: "Message deleted" });
    if (conversationDialog.user) viewConversations(conversationDialog.user);
  };

  const getProfileName = (uid: string | null) => {
    if (!uid) return "Unknown";
    const p = profiles.find(p => p.user_id === uid);
    return p ? p.full_name : uid.slice(0, 8);
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return "Permanent";
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `${Math.floor(diff / 60000)}m remaining`;
    if (hours < 24) return `${hours}h remaining`;
    const days = Math.floor(hours / 24);
    return `${days}d remaining`;
  };

  const restrictedUsers = profiles.filter(p => getRestriction(p.user_id));
  const activeUsers = profiles.filter(p => !getRestriction(p.user_id) && p.is_active);

  const getFilteredProfiles = () => {
    let list = profiles;
    if (activeSubTab === "restricted") list = restrictedUsers;
    else if (activeSubTab === "active") list = activeUsers;

    if (!searchQuery) return list;
    return list.filter(p =>
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.mobile_number.includes(searchQuery)
    );
  };

  const filteredProfiles = getFilteredProfiles();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">User Management</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => setInfoOpen(true)}>
            <Info className="h-3.5 w-3.5" /> Guidelines
          </Button>
          <Badge variant="outline">{profiles.length} users</Badge>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="w-full justify-start h-8">
          <TabsTrigger value="all" className="text-xs h-7 px-3">
            All ({profiles.length})
          </TabsTrigger>
          <TabsTrigger value="restricted" className="text-xs h-7 px-3">
            Restricted ({restrictedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs h-7 px-3">
            Active ({activeUsers.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Name, username or number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-9" />
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : filteredProfiles.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">No users found</div>
      ) : (
        <div className="space-y-2">
          {filteredProfiles.map(user => {
            const restriction = getRestriction(user.user_id);
            return (
              <Card key={user.user_id} className={restriction ? "border-destructive/30 bg-destructive/5" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">{user.full_name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{user.full_name}</span>
                        <span className="text-xs text-muted-foreground">@{user.username}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">📱 {user.mobile_number}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {(role === "super_admin" || role === "admin") && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Manage Groups"
                            onClick={() => openGroupDialog(user)}>
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="View Conversations"
                            onClick={() => viewConversations(user)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {!isProtectedFromAction(user.user_id) && (
                        <>
                          {restriction ? (
                            (role === "super_admin" || role === "admin" || role === "manager") && (
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => removeRestriction(restriction.id)}>
                                <ShieldOff className="h-3 w-3" /> Remove
                              </Button>
                            )
                          ) : (
                            <>
                              {(role === "super_admin" || role === "admin") && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Ban User"
                                    onClick={() => { setDuration("24h"); setActionDialog({ open: true, type: "ban", user }); }}>
                                    <Ban className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Restrict Messages"
                                    onClick={() => { setDuration("24h"); setActionDialog({ open: true, type: "restrict", user }); }}>
                                    <MessageSquareOff className="h-3.5 w-3.5 text-accent-foreground" />
                                  </Button>
                                  {role === "super_admin" && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Permanently Delete"
                                      onClick={() => setDeleteConfirm(user)}>
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  )}
                                </>
                              )}
                              {role === "manager" && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Restrict Messages"
                                  onClick={() => { setDuration("24h"); setActionDialog({ open: true, type: "restrict", user }); }}>
                                  <MessageSquareOff className="h-3.5 w-3.5 text-accent-foreground" />
                                </Button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {restriction && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap rounded-md bg-destructive/10 px-2.5 py-1.5">
                      <Badge variant="destructive" className="text-[10px]">
                        {restriction.restriction_type === "ban" ? "🚫 Banned" : restriction.restriction_type === "restrict" ? "⚠️ Restricted" : "🗑️ Deleted"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {getTimeRemaining(restriction.expires_at)}
                      </Badge>
                      {restriction.reason && (
                        <span className="text-[10px] text-muted-foreground">Reason: {restriction.reason}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Restriction Info Dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restriction Types</DialogTitle>
            <DialogDescription>What is allowed and blocked for each restriction</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {RESTRICTION_INFO.map(info => (
              <Card key={info.type} className={info.bgColor}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <info.icon className={`h-4 w-4 ${info.color}`} />
                    <span className={`font-semibold text-sm ${info.color}`}>{info.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                  <div className="grid grid-cols-1 gap-1">
                    {info.allowed.map((item, i) => (
                      <span key={i} className="text-[11px]">{item}</span>
                    ))}
                    {info.blocked.map((item, i) => (
                      <span key={i} className="text-[11px]">{item}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban/Restrict Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={o => setActionDialog(p => ({ ...p, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "ban" ? "🚫 Ban User" : "⚠️ Restrict Messages"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.user?.full_name} (@{actionDialog.user?.username})
            </DialogDescription>
          </DialogHeader>
          
          <Card className={actionDialog.type === "ban" ? "bg-destructive/10 border-destructive/20" : "bg-accent/10 border-accent/20"}>
            <CardContent className="p-3">
              {actionDialog.type === "restrict" ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium">Restricted user can:</p>
                  <p className="text-[11px] text-muted-foreground">✅ Complete tasks & submit reports</p>
                  <p className="text-[11px] text-muted-foreground">✅ Contact admin only</p>
                  <p className="text-[11px] text-destructive">❌ Cannot message other members</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium">Banned user:</p>
                  <p className="text-[11px] text-muted-foreground">✅ Can open and view the app</p>
                  <p className="text-[11px] text-destructive">❌ Cannot message, complete tasks, or submit reports</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">⏱️ Set Duration</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} rows={2} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActionDialog({ open: false, type: "", user: null })}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Go Back
            </Button>
            <Button variant="destructive" onClick={() => actionDialog.user && applyRestriction(actionDialog.type, actionDialog.user)}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={o => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {deleteConfirm?.full_name} (@{deleteConfirm?.username})?
              This number will be blocked from future registration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)} rows={2} />
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => deleteConfirm && applyRestriction("delete", deleteConfirm)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conversation Viewer */}
      <Dialog open={conversationDialog.open} onOpenChange={o => setConversationDialog(p => ({ ...p, open: o }))}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{conversationDialog.user?.full_name}'s Conversations</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {userMessages.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No messages</p>
            ) : (
              userMessages.map(msg => (
                <div key={msg.id} className={`flex items-start gap-2 rounded-lg border p-2.5 ${msg.is_deleted_by_admin ? "opacity-40" : ""}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium">{getProfileName(msg.sender_id)}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-muted-foreground">{getProfileName(msg.receiver_id)}</span>
                    </div>
                    <p className="mt-1 text-xs">{msg.content}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString("en-US")}
                    </p>
                  </div>
                  {!msg.is_deleted_by_admin && (role === "super_admin" || role === "admin") && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                      onClick={() => deleteMessage(msg.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Management Dialog */}
      <Dialog open={groupDialog.open} onOpenChange={o => setGroupDialog(p => ({ ...p, open: o }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Group Management</DialogTitle>
            <DialogDescription>
              {groupDialog.user?.full_name} (@{groupDialog.user?.username}) — Assign/change groups
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {businesses.map(b => (
              <div key={b.id} className="flex items-center gap-2">
                <Checkbox
                  id={`grp-${b.id}`}
                  checked={userGroupIds.includes(b.id)}
                  onCheckedChange={() => toggleGroup(b.id)}
                />
                <Label htmlFor={`grp-${b.id}`} className="text-sm cursor-pointer">{b.name}</Label>
              </div>
            ))}
            {userGroupIds.length > 1 && (
              <p className="text-[11px] text-primary">
                ✅ Will be in {userGroupIds.length} groups — can switch in dashboard
              </p>
            )}
            {userGroupIds.length === 0 && (
              <p className="text-[11px] text-destructive">⚠️ Select at least one group</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialog({ open: false, user: null })}>Cancel</Button>
            <Button onClick={saveGroups} disabled={savingGroups || userGroupIds.length === 0}>
              {savingGroups ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementSection;
