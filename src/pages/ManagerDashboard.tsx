import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ClipboardList, MessageCircle, LayoutDashboard, Megaphone, Clock, Star, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import TaskListView from "@/components/tasks/TaskListView";
import ChatModule from "@/components/chat/ChatModule";
import AdminDashboardHome from "@/components/dashboard/AdminDashboardHome";
import ExportReports from "@/components/dashboard/ExportReports";
import AnnouncementsModule from "@/components/modules/AnnouncementsModule";
import ShiftsModule from "@/components/modules/ShiftsModule";
import PerformanceModule from "@/components/modules/PerformanceModule";

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [verified, setVerified] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { navigate("/login"); return; }
      setSession(s);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", s.user.id);

      const isManager = roles?.some(r => r.role === "manager");
      if (!isManager) {
        toast({ title: "Access Denied", variant: "destructive" });
        navigate("/dashboard");
        return;
      }
      setVerified(true);

      const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", s.user.id).maybeSingle();
      if (prof) setProfileName(prof.full_name);
    };
    checkAccess();
  }, [navigate, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (!verified || !session) return null;

  const navItems = [
    { id: "home", icon: LayoutDashboard, title: "Dashboard" },
    { id: "tasks", icon: ClipboardList, title: "Tasks" },
    { id: "chat", icon: MessageCircle, title: "Messages" },
    { id: "announcements", icon: Megaphone, title: "Notices" },
    { id: "shifts", icon: Clock, title: "Shifts" },
    { id: "performance", icon: Star, title: "Reviews" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold text-foreground hidden sm:inline">{profileName || "Manager Panel"}</span>
          <span className="text-sm font-bold text-foreground sm:hidden text-center flex-1">{profileName || "Manager"}</span>
          <div className="flex items-center gap-1">
            <div className="hidden md:flex items-center gap-0.5">
              {navItems.map(item => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setActiveTab(item.id)}
                  title={item.title}
                >
                  <item.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-4">
        {activeTab === "home" && (
          <div className="space-y-6">
            <AdminDashboardHome userId={session.user.id} role="manager" onNavigate={(tab) => setActiveTab(tab)} />
            <ExportReports userId={session.user.id} role="manager" />
          </div>
        )}
        {activeTab === "tasks" && <TaskListView userId={session.user.id} role="manager" />}
        {activeTab === "chat" && <ChatModule userId={session.user.id} role="manager" />}
        {activeTab === "announcements" && <AnnouncementsModule userId={session.user.id} role="manager" />}
        {activeTab === "shifts" && <ShiftsModule userId={session.user.id} role="manager" />}
        {activeTab === "performance" && <PerformanceModule userId={session.user.id} role="manager" />}
      </div>
    </div>
  );
};

export default ManagerDashboard;
