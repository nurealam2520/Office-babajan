import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Copy, Check, RefreshCw, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}

const AdminOtpDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminAccess = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return false;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const adminRoles = roles?.filter(r => r.role === "admin" || r.role === "super_admin");
    if (!adminRoles?.length) {
      toast({ title: "Access Denied", description: "Only admins can view this page", variant: "destructive" });
      navigate("/dashboard");
      return false;
    }
    setIsAdmin(true);
    return true;
  }, [navigate, toast]);

  const fetchPendingUsers = useCallback(async () => {
    setLoading(true);
    // Get inactive profiles
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

    // Get OTPs for these users
    const userIds = profiles.map(p => p.user_id);
    const { data: otps } = await supabase
      .from("otp_codes")
      .select("user_id, code, created_at")
      .in("user_id", userIds)
      .eq("is_used", false)
      .order("created_at", { ascending: false });

    // Map OTPs to users (latest OTP per user)
    const otpMap = new Map<string, { code: string; created_at: string }>();
    otps?.forEach(otp => {
      if (!otpMap.has(otp.user_id)) {
        otpMap.set(otp.user_id, { code: otp.code, created_at: otp.created_at });
      }
    });

    const merged: PendingUser[] = profiles.map(p => ({
      ...p,
      otp_code: otpMap.get(p.user_id)?.code || null,
      otp_created_at: otpMap.get(p.user_id)?.created_at || null,
    }));

    setPendingUsers(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const ok = await checkAdminAccess();
      if (ok) await fetchPendingUsers();
    };
    init();
  }, [checkAdminAccess, fetchPendingUsers]);

  const copyOtp = (userId: string, otp: string) => {
    navigator.clipboard.writeText(otp);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied", description: `OTP: ${otp}` });
  };

  const regenerateOtp = async (userId: string) => {
    const { data, error } = await supabase.rpc("generate_otp", { _user_id: userId });
    if (error) {
      toast({ title: "ত্রুটি", description: "OTP তৈরি করতে সমস্যা", variant: "destructive" });
      return;
    }
    toast({ title: "নতুন OTP", description: `OTP: ${data}` });
    await fetchPendingUsers();
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "এইমাত্র";
    if (mins < 60) return `${mins} মিনিট আগে`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ঘণ্টা আগে`;
    return `${Math.floor(hrs / 24)} দিন আগে`;
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground md:text-2xl">OTP ম্যানেজমেন্ট</h1>
              <p className="text-sm text-muted-foreground">অপেক্ষমাণ ব্যবহারকারীদের OTP</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchPendingUsers}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              ড্যাশবোর্ড
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span>লোড হচ্ছে...</span>
            </div>
          </div>
        ) : pendingUsers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Users className="h-12 w-12" />
              <p className="text-lg font-medium">কোন অপেক্ষমাণ ব্যবহারকারী নেই</p>
              <p className="text-sm">সকল ব্যবহারকারী সক্রিয় আছে</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{pendingUsers.length} জন অপেক্ষমাণ</span>
            </div>

            {pendingUsers.map((user) => (
              <Card key={user.user_id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{user.full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {timeAgo(user.created_at)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">📱 {user.mobile_number}</p>

                  {user.otp_code ? (
                    <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
                      <span className="text-sm font-medium text-muted-foreground">OTP:</span>
                      <span className="font-mono text-2xl font-bold tracking-[0.3em] text-primary">
                        {user.otp_code}
                      </span>
                      <div className="ml-auto flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyOtp(user.user_id, user.otp_code!)}
                        >
                          {copiedId === user.user_id ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => regenerateOtp(user.user_id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => regenerateOtp(user.user_id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                      OTP তৈরি করুন
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOtpDashboard;
