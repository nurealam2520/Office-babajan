import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string; username: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUserId(session.user.id);

      // Check if admin/super_admin and redirect
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      
      const isAdminUser = roles?.some(r => r.role === "admin" || r.role === "super_admin");
      if (isAdminUser) {
        navigate("/admin");
        return;
      }
      const isManager = roles?.some(r => r.role === "manager");
      if (isManager) {
        navigate("/manager");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setProfile(data);
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-md text-center space-y-4">
        <h1 className="text-2xl font-bold text-primary">স্বাগতম!</h1>
        {profile && (
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">{profile.full_name}</p>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>
        )}
        <p className="text-muted-foreground">ড্যাশবোর্ড শীঘ্রই আসছে...</p>
        <div className="flex items-center gap-2">
          {userId && <NotificationBell userId={userId} />}
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            লগআউট
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
