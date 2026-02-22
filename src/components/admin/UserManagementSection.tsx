import { useEffect, useState, useCallback } from "react";
import { Ban, Trash2, ShieldOff, Search, Users, Eye, MessageSquareOff } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  role: "super_admin" | "admin";
}

const UserManagementSection = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [restrictions, setRestrictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: string; user: any | null }>({
    open: false, type: "", user: null,
  });
  const [reason, setReason] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [conversationDialog, setConversationDialog] = useState<{ open: boolean; user: any | null }>({
    open: false, user: null,
  });
  const [userConversations, setUserConversations] = useState<any[]>([]);
  const [userMessages, setUserMessages] = useState<any[]>([]);

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
    const { error } = await supabase.from("user_restrictions").insert({
      user_id: targetUser.user_id,
      restriction_type: type,
      reason: reason || null,
      restricted_by: userId,
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

  const getProfileName = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p ? p.full_name : uid.slice(0, 8);
  };

  const filteredProfiles = profiles.filter(p =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.mobile_number.includes(searchQuery)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ইউজার ম্যানেজমেন্ট</h2>
        <Badge variant="outline">{profiles.length} জন</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="নাম, ইউজারনেম বা নম্বর..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
      ) : (
        <div className="space-y-2">
          {filteredProfiles.map(user => {
            const restriction = getRestriction(user.user_id);
            return (
              <Card key={user.user_id} className={restriction ? "border-destructive/30" : ""}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.full_name}</span>
                      <span className="text-sm text-muted-foreground">@{user.username}</span>
                      {!user.is_active && <Badge variant="destructive" className="text-xs">নিষ্ক্রিয়</Badge>}
                      {restriction && (
                        <Badge variant="destructive" className="text-xs">
                          {restriction.restriction_type === "ban" ? "ব্যান" : restriction.restriction_type === "restrict" ? "সীমাবদ্ধ" : "ডিলিট"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">📱 {user.mobile_number}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="কথোপকথন দেখুন"
                      onClick={() => viewConversations(user)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {restriction ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRestriction(restriction.id)}>
                        <ShieldOff className="h-4 w-4 text-primary" />
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => setActionDialog({ open: true, type: "ban", user })}>
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => setActionDialog({ open: true, type: "restrict", user })}>
                          <MessageSquareOff className="h-4 w-4 text-accent-foreground" />
                        </Button>
                        {role === "super_admin" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => setDeleteConfirm(user)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Ban/Restrict Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={o => setActionDialog(p => ({ ...p, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "ban" ? "ব্যবহারকারী ব্যান" : "সীমাবদ্ধ করুন"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.user?.full_name} (@{actionDialog.user?.username})
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="কারণ (ঐচ্ছিক)" value={reason} onChange={e => setReason(e.target.value)} rows={3} />
          <DialogFooter>
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
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
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
                <div key={msg.id} className={`flex items-start gap-2 rounded-lg border p-3 ${msg.is_deleted_by_admin ? "opacity-40" : ""}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{getProfileName(msg.sender_id)}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-muted-foreground">{getProfileName(msg.receiver_id)}</span>
                    </div>
                    <p className="mt-1 text-sm">{msg.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString("bn-BD")}
                    </p>
                  </div>
                  {!msg.is_deleted_by_admin && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                      onClick={() => deleteMessage(msg.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
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
