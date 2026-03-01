import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string; username: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUserId(session.user.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const isAdmin = roles?.some(r => r.role === "admin" || r.role === "super_admin");
      if (isAdmin) { navigate("/admin"); return; }
      const isManager = roles?.some(r => r.role === "manager");
      if (isManager) { navigate("/manager"); return; }

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

  if (!userId) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-bold text-foreground">{profile?.full_name || "ড্যাশবোর্ড"}</p>
            {profile && <p className="text-[10px] text-muted-foreground">@{profile.username}</p>}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 text-center">
        <p className="text-muted-foreground">স্বাগতম! নতুন ফিচার শীঘ্রই আসছে...</p>
      </div>
    </div>
  );
};

export default Dashboard;
