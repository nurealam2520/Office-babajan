import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ClipboardList, MessageCircle, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import TaskListView from "@/components/tasks/TaskListView";
import ChatModule from "@/components/chat/ChatModule";
import AdminDashboardHome from "@/components/dashboard/AdminDashboardHome";
import ExportReports from "@/components/dashboard/ExportReports";

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [verified, setVerified] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [activeTab, setActiveTab] = useState("home");

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold text-foreground">{profileName || "Manager Panel"}</span>
          <div className="flex items-center gap-1">
            <Button
              variant={activeTab === "home" ? "default" : "ghost"}
              size="icon"
              onClick={() => setActiveTab("home")}
              title="Dashboard"
            >
              <LayoutDashboard className="h-5 w-5" />
            </Button>
            <Button
              variant={activeTab === "tasks" ? "default" : "ghost"}
              size="icon"
              onClick={() => setActiveTab("tasks")}
              title="Tasks"
            >
              <ClipboardList className="h-5 w-5" />
            </Button>
            <Button
              variant={activeTab === "chat" ? "default" : "ghost"}
              size="icon"
              onClick={() => setActiveTab("chat")}
              title="Messages"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-4">
        {activeTab === "home" && (
          <div className="space-y-6">
            <AdminDashboardHome userId={session.user.id} role="manager" />
            <ExportReports userId={session.user.id} role="manager" />
          </div>
        )}
        {activeTab === "tasks" && <TaskListView userId={session.user.id} role="manager" />}
        {activeTab === "chat" && <ChatModule userId={session.user.id} role="manager" />}
      </div>
    </div>
  );
};

export default ManagerDashboard;
