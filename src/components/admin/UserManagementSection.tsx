import { useEffect, useState, useCallback } from "react";
import { Ban, Trash2, ShieldOff, Search, Eye, MessageSquareOff, Clock, ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  { value: "1h", label: "১ ঘণ্টা" },
  { value: "6h", label: "৬ ঘণ্টা" },
  { value: "24h", label: "২৪ ঘণ্টা" },
  { value: "3d", label: "৩ দিন" },
  { value: "7d", label: "৭ দিন" },
  { value: "30d", label: "৩০ দিন" },
  { value: "permanent", label: "স্থায়ী" },
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
    title: "সীমাবদ্ধ (Restrict)",
    color: "text-accent-foreground",
    bgColor: "bg-accent/10",
    description: "মেসেজ করতে পারবে না (অ্যাডমিন ছাড়া)",
    allowed: ["✅ টাস্ক দেখা ও সম্পন্ন করা", "✅ রিপোর্ট জমা দেওয়া", "✅ শুধু অ্যাডমিনের সাথে যোগাযোগ"],
    blocked: ["❌ অন্য মেম্বারদের মেসেজ করা", "❌ ব্রডকাস্ট পাঠানো"],
  },
  {
    type: "ban",
    icon: Ban,
    title: "ব্যান (Ban)",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    description: "অ্যাপে শুধু দেখতে পারবে, কিছু করতে পারবে না",
    allowed: ["✅ অ্যাপ ওপেন করা", "✅ ড্যাশবোর্ড দেখা"],
    blocked: ["❌ মেসেজ পাঠানো", "❌ টাস্ক সম্পন্ন করা", "❌ রিপোর্ট জমা দেওয়া", "❌ কোনো অ্যাকশন নেওয়া"],
  },
];

const UserManagementSection = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [restrictions, setRestrictions] = useState<any[]>([]);
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_restrictions").select("*").eq("is_active", true),
    ]);
    setProfiles(p || []);
    setRestrictions(r || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getRestriction = (uid: string) => restrictions.find(r => r.user_id === uid);

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
      toast({ title: "ত্রুটি", variant: "destructive" });
    } else {
      toast({ title: "সফল", description: `ব্যবহারকারী ${type === "ban" ? "ব্যান" : type === "restrict" ? "সীমাবদ্ধ" : "ডিলিট"} করা হয়েছে` });
      setActionDialog({ open: false, type: "", user: null });
      setReason("");
      setDuration("24h");
      fetchData();
    }
  };

  const removeRestriction = async (restrictionId: string) => {
    await supabase.from("user_restrictions").update({ is_active: false }).eq("id", restrictionId);
    toast({ title: "সফল", description: "নিষেধাজ্ঞা তুলে নেওয়া হয়েছে" });
    fetchData();
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
    toast({ title: "মেসেজ মুছে ফেলা হয়েছে" });
    if (conversationDialog.user) viewConversations(conversationDialog.user);
  };

  const getProfileName = (uid: string | null) => {
    if (!uid) return "অজানা";
    const p = profiles.find(p => p.user_id === uid);
    return p ? p.full_name : uid.slice(0, 8);
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return "স্থায়ী";
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "মেয়াদ শেষ";
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `${Math.floor(diff / 60000)} মিনিট বাকি`;
    if (hours < 24) return `${hours} ঘণ্টা বাকি`;
    const days = Math.floor(hours / 24);
    return `${days} দিন বাকি`;
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
        <h2 className="text-lg font-semibold">ইউজার ম্যানেজমেন্ট</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => setInfoOpen(true)}>
            <Info className="h-3.5 w-3.5" /> নিয়মাবলী
          </Button>
          <Badge variant="outline">{profiles.length} জন</Badge>
        </div>
      </div>

      {/* Sub-tabs for filtering */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="w-full justify-start h-8">
          <TabsTrigger value="all" className="text-xs h-7 px-3">
            সবাই ({profiles.length})
          </TabsTrigger>
          <TabsTrigger value="restricted" className="text-xs h-7 px-3">
            নিষেধাজ্ঞাপ্রাপ্ত ({restrictedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs h-7 px-3">
            সক্রিয় ({activeUsers.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="নাম, ইউজারনেম বা নম্বর..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-9" />
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
      ) : filteredProfiles.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">কোন ব্যবহারকারী পাওয়া যায়নি</div>
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
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="কথোপকথন দেখুন"
                          onClick={() => viewConversations(user)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {restriction ? (
                        (role === "super_admin" || role === "admin") && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => removeRestriction(restriction.id)}>
                            <ShieldOff className="h-3 w-3" /> সরান
                          </Button>
                        )
                      ) : (
                        (role === "super_admin" || role === "admin") && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="ব্যান করুন"
                              onClick={() => { setDuration("24h"); setActionDialog({ open: true, type: "ban", user }); }}>
                              <Ban className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="মেসেজ সীমাবদ্ধ করুন"
                              onClick={() => { setDuration("24h"); setActionDialog({ open: true, type: "restrict", user }); }}>
                              <MessageSquareOff className="h-3.5 w-3.5 text-accent-foreground" />
                            </Button>
                            {role === "super_admin" && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="স্থায়ীভাবে ডিলিট"
                                onClick={() => setDeleteConfirm(user)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                          </>
                        )
                      )}
                    </div>
                  </div>
                  {/* Restriction detail bar */}
                  {restriction && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap rounded-md bg-destructive/10 px-2.5 py-1.5">
                      <Badge variant="destructive" className="text-[10px]">
                        {restriction.restriction_type === "ban" ? "🚫 ব্যান" : restriction.restriction_type === "restrict" ? "⚠️ সীমাবদ্ধ" : "🗑️ ডিলিট"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {getTimeRemaining(restriction.expires_at)}
                      </Badge>
                      {restriction.reason && (
                        <span className="text-[10px] text-muted-foreground">কারণ: {restriction.reason}</span>
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
            <DialogTitle>নিষেধাজ্ঞার ধরন</DialogTitle>
            <DialogDescription>প্রতিটি নিষেধাজ্ঞায় কী অনুমোদিত ও কী নিষিদ্ধ</DialogDescription>
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

      {/* Ban/Restrict Dialog with Duration */}
      <Dialog open={actionDialog.open} onOpenChange={o => setActionDialog(p => ({ ...p, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "ban" ? "🚫 ব্যবহারকারী ব্যান" : "⚠️ মেসেজ সীমাবদ্ধ করুন"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.user?.full_name} (@{actionDialog.user?.username})
            </DialogDescription>
          </DialogHeader>
          
          {/* Restriction type description card */}
          <Card className={actionDialog.type === "ban" ? "bg-destructive/10 border-destructive/20" : "bg-accent/10 border-accent/20"}>
            <CardContent className="p-3">
              {actionDialog.type === "restrict" ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium">সীমাবদ্ধ ব্যবহারকারী যা করতে পারবে:</p>
                  <p className="text-[11px] text-muted-foreground">✅ টাস্ক সম্পন্ন ও রিপোর্ট জমা</p>
                  <p className="text-[11px] text-muted-foreground">✅ শুধু অ্যাডমিনের সাথে যোগাযোগ</p>
                  <p className="text-[11px] text-destructive">❌ অন্য মেম্বারদের মেসেজ করা যাবে না</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium">ব্যান ব্যবহারকারী:</p>
                  <p className="text-[11px] text-muted-foreground">✅ অ্যাপ ওপেন করে দেখতে পারবে</p>
                  <p className="text-[11px] text-destructive">❌ মেসেজ, টাস্ক, রিপোর্ট — কিছুই করতে পারবে না</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">⏱️ সময়সীমা নির্ধারণ করুন</label>
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
            <Textarea placeholder="কারণ (ঐচ্ছিক)" value={reason} onChange={e => setReason(e.target.value)} rows={2} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActionDialog({ open: false, type: "", user: null })}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> ফিরে যান
            </Button>
            <Button variant="destructive" onClick={() => actionDialog.user && applyRestriction(actionDialog.type, actionDialog.user)}>
              নিশ্চিত করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={o => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ব্যবহারকারী ডিলিট</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.full_name} (@{deleteConfirm?.username}) কে স্থায়ীভাবে ডিলিট করবেন?
              এই নম্বর দিয়ে আর রেজিস্ট্রেশন করা যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="কারণ" value={reason} onChange={e => setReason(e.target.value)} rows={2} />
          <AlertDialogFooter>
            <AlertDialogCancel>ফিরে যান</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => deleteConfirm && applyRestriction("delete", deleteConfirm)}>
              ডিলিট করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conversation Viewer */}
      <Dialog open={conversationDialog.open} onOpenChange={o => setConversationDialog(p => ({ ...p, open: o }))}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{conversationDialog.user?.full_name} এর কথোপকথন</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {userMessages.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">কোন মেসেজ নেই</p>
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
                      {new Date(msg.created_at).toLocaleString("bn-BD")}
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
    </div>
  );
};

export default UserManagementSection;
