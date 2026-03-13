import { useEffect, useState, useCallback } from "react";
import { Copy, Check, RefreshCw, Users, Clock, Trash2, ShieldOff, Ban } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ROLE_OPTIONS = [
  { value: "co_worker", label: "Co-Worker" },
  { value: "co_worker_data_entry", label: "Co-Worker + Data Entry" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

interface PendingUser {
  user_id: string;
  full_name: string;
  username: string;
  mobile_number: string;
  created_at: string;
  otp_code: string | null;
  otp_created_at: string | null;
  selectedRole: string;
}

interface BlockedNumber {
  id: string;
  mobile_number: string;
  country_code: string;
  reason: string | null;
  created_at: string;
}

const OtpSection = () => {
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PendingUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [blockedNumbers, setBlockedNumbers] = useState<BlockedNumber[]>([]);
  const [unblockConfirm, setUnblockConfirm] = useState<BlockedNumber | null>(null);
  const [unblocking, setUnblocking] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchBlockedNumbers = useCallback(async () => {
    const { data } = await supabase
      .from("blocked_numbers")
      .select("id, mobile_number, country_code, reason, created_at")
      .order("created_at", { ascending: false });
    setBlockedNumbers(data || []);
  }, []);

  const checkSuperAdmin = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    if (roles?.some(r => r.role === "super_admin")) {
      setIsSuperAdmin(true);
    }
  }, []);

  const fetchPendingUsers = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, username, mobile_number, created_at")
      .eq("is_active", false)
      .order("created_at", { ascending: false });

    if (!profiles?.length) {
      setPendingUsers([]);
      setLoading(false);
      return;
    }

    const userIds = profiles.map(p => p.user_id);
    const { data: otps } = await supabase
      .from("otp_codes")
      .select("user_id, code, created_at")
      .in("user_id", userIds)
      .eq("is_used", false)
      .order("created_at", { ascending: false });

    const otpMap = new Map<string, { code: string; created_at: string }>();
    otps?.forEach(otp => {
      if (!otpMap.has(otp.user_id)) {
        otpMap.set(otp.user_id, { code: otp.code, created_at: otp.created_at });
      }
    });

    setPendingUsers(profiles.map(p => ({
      ...p,
      otp_code: otpMap.get(p.user_id)?.code || null,
      otp_created_at: otpMap.get(p.user_id)?.created_at || null,
      selectedRole: "co_worker",
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPendingUsers();
    checkSuperAdmin();
    fetchBlockedNumbers();
  }, [fetchPendingUsers, checkSuperAdmin, fetchBlockedNumbers]);

  const updateUserRole = (userId: string, value: string) => {
    setPendingUsers(prev => prev.map(u => u.user_id === userId ? { ...u, selectedRole: value } : u));
  };

  const copyOtp = (userId: string, otp: string) => {
    navigator.clipboard.writeText(otp);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied", description: `OTP: ${otp}` });
  };

  const rejectUser = async (user: PendingUser) => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target_user_id: user.user_id,
            mobile_number: user.mobile_number,
            reason: "Registration rejected by admin",
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: result.error || "Failed to delete", variant: "destructive" });
      } else {
        toast({ title: "Deleted", description: `${user.full_name} has been removed` });
        await fetchPendingUsers();
      }
    } catch {
      toast({ title: "Error", description: "Server error", variant: "destructive" });
    }
    setDeleting(false);
    setDeleteConfirm(null);
  };

  const unblockNumber = async (blocked: BlockedNumber) => {
    setUnblocking(true);
    try {
      const { error } = await supabase
        .from("blocked_numbers")
        .delete()
        .eq("id", blocked.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Unblocked", description: `${blocked.country_code}${blocked.mobile_number} has been unblocked` });
        await fetchBlockedNumbers();
      }
    } catch {
      toast({ title: "Error", description: "Server error", variant: "destructive" });
    }
    setUnblocking(false);
    setUnblockConfirm(null);
  };

  const generateOtp = async (user: PendingUser) => {
    const roleToAssign = user.selectedRole;
    const { data: existingRoles } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.user_id)
      .eq("role", roleToAssign as any);

    if (!existingRoles?.length) {
      await supabase.from("user_roles").insert({ user_id: user.user_id, role: roleToAssign } as any);
    }

    const { data, error } = await supabase.rpc("generate_otp", { _user_id: user.user_id });
    if (error) {
      toast({ title: "Error", description: "Failed to generate OTP", variant: "destructive" });
      return;
    }
    toast({ title: "New OTP", description: `OTP: ${data}` });
    await fetchPendingUsers();
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">OTP Management</h2>
        <Button variant="outline" size="sm" onClick={fetchPendingUsers}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {pendingUsers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Users className="h-12 w-12" />
            <p className="text-lg font-medium">No pending users</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{pendingUsers.length} pending</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {pendingUsers.map((user) => (
              <Card key={user.user_id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{user.full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{timeAgo(user.created_at)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">📱 {user.mobile_number}</p>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
                    <Select value={user.selectedRole} onValueChange={(v) => updateUserRole(user.user_id, v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {user.otp_code ? (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <span className="font-mono text-2xl font-bold tracking-[0.3em] text-primary">
                        {user.otp_code}
                      </span>
                      <div className="ml-auto flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyOtp(user.user_id, user.otp_code!)}>
                          {copiedId === user.user_id ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => generateOtp(user)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => generateOtp(user)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate OTP
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => setDeleteConfirm(user)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Reject & Delete
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Registration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteConfirm?.full_name}</strong> (@{deleteConfirm?.username}) and block their mobile number from re-registering.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && rejectUser(deleteConfirm)}
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blocked Numbers Section - Super Admin Only */}
      {isSuperAdmin && (
        <div className="space-y-3 mt-6">
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-semibold">Blocked Numbers</h2>
            <Badge variant="secondary" className="text-xs">{blockedNumbers.length}</Badge>
          </div>

          {blockedNumbers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <ShieldOff className="h-10 w-10" />
                <p className="text-sm">No blocked numbers</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {blockedNumbers.map((b) => (
                <Card key={b.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-mono text-sm font-medium">{b.country_code}{b.mobile_number}</p>
                      {b.reason && <p className="text-xs text-muted-foreground mt-0.5">{b.reason}</p>}
                      <p className="text-[10px] text-muted-foreground">{timeAgo(b.created_at)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setUnblockConfirm(b)}
                    >
                      <ShieldOff className="mr-1 h-3 w-3" />
                      Unblock
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!unblockConfirm} onOpenChange={() => setUnblockConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock Number?</AlertDialogTitle>
            <AlertDialogDescription>
              Unblocking <strong>{unblockConfirm?.country_code}{unblockConfirm?.mobile_number}</strong> will allow this number to register again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unblocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={unblocking}
              onClick={() => unblockConfirm && unblockNumber(unblockConfirm)}
            >
              {unblocking ? "Unblocking..." : "Yes, Unblock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OtpSection;
