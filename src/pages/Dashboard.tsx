import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, CalendarCheck, FileText, LogOut, Menu, X, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import MyTasks from "@/components/member/MyTasks";
import MemberAttendance from "@/components/member/MemberAttendance";
import ReportHistory from "@/components/member/ReportHistory";
import LeaveManagement from "@/components/member/LeaveManagement";

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string; username: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [taskCount, setTaskCount] = useState(0);

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

      const { data: activeTasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("assigned_to", session.user.id)
        .neq("status", "completed");
      setTaskCount(activeTasks?.length || 0);
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (!userId) return null;

  const tabs = [
    { id: "tasks", label: "Tasks", icon: ClipboardList, badge: taskCount },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "leave", label: "Leave", icon: CalendarDays },
    { id: "reports", label: "Reports", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-bold text-foreground">{profile?.full_name || "Dashboard"}</p>
            {profile && <p className="text-[10px] text-muted-foreground">@{profile.username}</p>}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="mb-4 hidden md:flex gap-2">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge ? <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{tab.badge}</Badge> : null}
            </Button>
          ))}
        </div>

        {mobileMenuOpen && (
          <div className="mb-4 grid grid-cols-3 gap-2 md:hidden">
            {tabs.map(tab => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                className="flex-col gap-1 h-16 text-xs"
                onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.badge ? <Badge variant="secondary" className="text-[9px] px-1">{tab.badge}</Badge> : null}
              </Button>
            ))}
          </div>
        )}

        <div className="mb-3 flex items-center gap-2 md:hidden">
          {(() => {
            const t = tabs.find(t => t.id === activeTab);
            if (!t) return null;
            return (
              <Button variant="secondary" size="sm" className="gap-2 pointer-events-none text-xs">
                <t.icon className="h-4 w-4" />
                {t.label}
              </Button>
            );
          })()}
        </div>

        {activeTab === "tasks" && <MyTasks userId={userId} />}
        {activeTab === "attendance" && <MemberAttendance userId={userId} />}
        {activeTab === "leave" && <LeaveManagement userId={userId} />}
        {activeTab === "reports" && <ReportHistory userId={userId} />}
      </div>
    </div>
  );
};

export default Dashboard;
