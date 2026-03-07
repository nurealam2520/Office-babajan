import { useEffect, useState, useCallback } from "react";
import { Copy, Check, RefreshCw, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PendingUser {
  user_id: string;
  full_name: string;
  username: string;
  mobile_number: string;
  created_at: string;
  otp_code: string | null;
  otp_created_at: string | null;
  selectedRole: string;
  selectedGroups: string[];
}

const OtpSection = () => {
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<{ id: string; name: string; slug: string }[]>([]);

  const fetchPendingUsers = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: biz }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, username, mobile_number, created_at")
        .eq("is_active", false)
        .order("created_at", { ascending: false }),
      supabase.from("businesses").select("id, name, slug").eq("is_active", true),
    ]);

    if (biz) setBusinesses(biz);

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
      selectedRole: "member",
      selectedGroups: [],
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchPendingUsers(); }, [fetchPendingUsers]);

  const updateUserRole = (userId: string, value: string) => {
    setPendingUsers(prev => prev.map(u => u.user_id === userId ? { ...u, selectedRole: value } : u));
  };

  const toggleUserGroup = (userId: string, businessId: string) => {
    setPendingUsers(prev => prev.map(u => {
      if (u.user_id !== userId) return u;
      const groups = u.selectedGroups.includes(businessId)
        ? u.selectedGroups.filter(g => g !== businessId)
        : [...u.selectedGroups, businessId];
      return { ...u, selectedGroups: groups };
    }));
  };

  const copyOtp = (userId: string, otp: string) => {
    navigator.clipboard.writeText(otp);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied", description: `OTP: ${otp}` });
  };

  const generateOtp = async (user: PendingUser) => {
    if (user.selectedGroups.length === 0) {
      toast({ title: "Error", description: "Select at least one group", variant: "destructive" });
      return;
    }

    await supabase.from("profiles").update({ business_id: user.selectedGroups[0] }).eq("user_id", user.user_id);

    const { data: session } = await supabase.auth.getSession();
    const adminId = session?.session?.user?.id;
    
    for (const bizId of user.selectedGroups) {
      await supabase.from("user_businesses").upsert({
        user_id: user.user_id,
        business_id: bizId,
        assigned_by: adminId || null,
      }, { onConflict: "user_id,business_id" });
    }

    const roleToAssign = user.selectedRole as "manager" | "member";
    const { data: existingRoles } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.user_id)
      .eq("role", roleToAssign);

    if (!existingRoles?.length) {
      await supabase.from("user_roles").insert({ user_id: user.user_id, role: roleToAssign });
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
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Select groups (multiple allowed)
                    </label>
                    <div className="space-y-2">
                      {businesses.map(b => (
                        <div key={b.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`${user.user_id}-${b.id}`}
                            checked={user.selectedGroups.includes(b.id)}
                            onCheckedChange={() => toggleUserGroup(user.user_id, b.id)}
                          />
                          <Label htmlFor={`${user.user_id}-${b.id}`} className="text-sm cursor-pointer">
                            {b.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {user.selectedGroups.length > 1 && (
                      <p className="text-[11px] text-primary mt-1">
                        ✅ Will be added to {user.selectedGroups.length} groups — can switch in dashboard
                      </p>
                    )}
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
                      disabled={user.selectedGroups.length === 0}
                      onClick={() => generateOtp(user)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {user.selectedGroups.length === 0 ? "Select a group first" : "Generate OTP"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default OtpSection;
