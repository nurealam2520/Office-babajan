// Dashboard - Co-Worker / Co-Worker+DataEntry view
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, CalendarCheck, FileText, LogOut, Menu, X, CalendarDays, MessageCircle, LayoutDashboard, Megaphone, Clock, DollarSign, Package, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuthReady } from "@/hooks/useAuthReady";
import TaskListView from "@/components/tasks/TaskListView";
import MemberAttendance from "@/components/member/MemberAttendance";
import ReportHistory from "@/components/member/ReportHistory";
import LeaveManagement from "@/components/member/LeaveManagement";
import ChatModule from "@/components/chat/ChatModule";
import StaffDashboardHome from "@/components/dashboard/StaffDashboardHome";
import AnnouncementsModule from "@/components/modules/AnnouncementsModule";
import ShiftsModule from "@/components/modules/ShiftsModule";
import AssetsModule from "@/components/modules/AssetsModule";
import PayrollModule from "@/components/modules/PayrollModule";
import officeLogo from "@/assets/office-logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isReady } = useAuthReady();
  const [profile, setProfile] = useState<{ full_name: string; username: string; employee_id: string | null } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("co_worker");
  const [activeTab, setActiveTab] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    if (!isReady) return;
    if (!user) { navigate("/login", { replace: true }); return; }

    const checkAuth = async () => {
      setUserId(user.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isAdmin = roles?.some(r => r.role === "admin" || r.role === "super_admin");
      if (isAdmin) { navigate("/admin"); return; }
      const isManager = roles?.some(r => r.role === "manager");
      if (isManager) { navigate("/manager"); return; }
      
      const isDataEntry = roles?.some(r => r.role === "co_worker_data_entry");
      if (isDataEntry) setUserRole("co_worker_data_entry");
      else setUserRole("co_worker");

      const { data } = await supabase
        .from("profiles")
        .select("full_name, username, employee_id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (!data?.employee_id) {
        navigate("/employee-setup");
        return;
      }
      
      setProfile(data);

      const { data: activeTasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("assigned_to", user.id)
        .neq("status", "completed");
      setTaskCount(activeTasks?.length || 0);
    };
    checkAuth();
  }, [navigate, isReady, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (!isReady) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  if (!userId) return null;

  const tabs = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "tasks", label: "Tasks", icon: ClipboardList, badge: taskCount },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "leave", label: "Leave", icon: CalendarDays },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "notices", label: "Notices", icon: Megaphone },
    { id: "shifts", label: "Shifts", icon: Clock },
    { id: "payroll", label: "Payroll", icon: DollarSign },
    { id: "assets", label: "Assets", icon: Package },
    { id: "reports", label: "Reports", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={officeLogo} alt="Office Management" className="h-8 w-8 rounded-full object-cover" />
            <div className="text-left">
              <p className="text-sm font-bold text-foreground">{profile?.full_name || "Dashboard"}</p>
              {profile && <p className="text-[10px] text-muted-foreground">@{profile.username}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} title="Profile">
              <UserCircle className="h-5 w-5" />
            </Button>
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
        <div className="mb-4 hidden md:flex gap-2 flex-wrap">
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

        <div className="mb-3 flex items-center justify-center gap-2 md:hidden">
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

        {activeTab === "home" && <StaffDashboardHome userId={userId} onNavigate={(tab) => setActiveTab(tab)} />}
        {activeTab === "tasks" && <TaskListView userId={userId} role={userRole as any} />}
        {activeTab === "attendance" && <MemberAttendance userId={userId} />}
        {activeTab === "leave" && <LeaveManagement userId={userId} />}
        {activeTab === "chat" && <ChatModule userId={userId} role="co_worker" />}
        {activeTab === "notices" && <AnnouncementsModule userId={userId} role="co_worker" />}
        {activeTab === "shifts" && <ShiftsModule userId={userId} role="co_worker" />}
        {activeTab === "payroll" && <PayrollModule userId={userId} role="co_worker" />}
        {activeTab === "assets" && <AssetsModule userId={userId} role="co_worker" />}
        {activeTab === "reports" && <ReportHistory userId={userId} />}
      </div>
    </div>
  );
};

export default Dashboard;
