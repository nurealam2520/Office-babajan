import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, KeyRound, UserCog, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";
import OtpSection from "@/components/admin/OtpSection";
import UserManagementSection from "@/components/admin/UserManagementSection";
import shahzadaLogo from "@/assets/shahzada-logo.png";

type ActiveView = "home" | "otp" | "users";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [role, setRole] = useState<"super_admin" | "admin" | null>(null);
  const [session, setSession] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [activeView, setActiveView] = useState<ActiveView>("home");

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { navigate("/login"); return; }
      setSession(s);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", s.user.id);

      const isSuperAdmin = roles?.some(r => r.role === "super_admin");
      const isAdmin = roles?.some(r => r.role === "admin");

      if (isSuperAdmin) setRole("super_admin");
      else if (isAdmin) setRole("admin");
      else {
        toast({ title: "অনুমতি নেই", variant: "destructive" });
        navigate("/dashboard");
        return;
      }

      const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", s.user.id).maybeSingle();
      if (prof) setProfileName(prof.full_name);
    };
    checkAccess();
  }, [navigate, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (!role || !session) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={shahzadaLogo} alt="Shahzada's Hub" className="h-8 w-8 rounded-full object-cover" />
            <span className="text-lg font-bold text-foreground">
              {profileName || (role === "super_admin" ? "সুপার অ্যাডমিন" : "অ্যাডমিন")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {role === "super_admin" && (
              <Button
                variant={activeView === "otp" ? "default" : "ghost"}
                size="icon"
                onClick={() => setActiveView(activeView === "otp" ? "home" : "otp")}
                title="OTP ম্যানেজমেন্ট"
              >
                <KeyRound className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant={activeView === "users" ? "default" : "ghost"}
              size="icon"
              onClick={() => setActiveView(activeView === "users" ? "home" : "users")}
              title="ইউজার ম্যানেজমেন্ট"
            >
              <UserCog className="h-5 w-5" />
            </Button>
            <ThemeToggle />
            {activeView !== "home" && (
              <Button variant="ghost" size="icon" onClick={() => setActiveView("home")} title="হোমে ফিরুন">
                <X className="h-5 w-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-4">
        {activeView === "otp" && <OtpSection />}
        {activeView === "users" && <UserManagementSection userId={session.user.id} role={role} />}
        {activeView === "home" && (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">স্বাগতম! নতুন ফিচার শীঘ্রই আসছে...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
