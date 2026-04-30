import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, KeyRound, UserCog, X, ClipboardList, CalendarCheck, MessageCircle, Megaphone, Clock, Package, DollarSign, Menu, LayoutDashboard, ScrollText, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuthReady } from "@/hooks/useAuthReady";
import OtpSection from "@/components/admin/OtpSection";
import UserManagementSection from "@/components/admin/UserManagementSection";
import TaskListView from "@/components/tasks/TaskListView";
import AttendanceAdmin from "@/components/admin/AttendanceAdmin";
import ChatModule from "@/components/chat/ChatModule";
import AdminDashboardHome from "@/components/dashboard/AdminDashboardHome";
import ExportReports from "@/components/dashboard/ExportReports";
import AnnouncementsModule from "@/components/modules/AnnouncementsModule";
import ShiftsModule from "@/components/modules/ShiftsModule";
import AssetsModule from "@/components/modules/AssetsModule";
import PayrollModule from "@/components/modules/PayrollModule";
import ActivityLogsModule from "@/components/modules/ActivityLogsModule";
import officeLogo from "@/assets/office-logo.png";

type ActiveView = "home" | "otp" | "users" | "tasks" | "attendance" | "chat" | "announcements" | "shifts" | "assets" | "payroll" | "logs";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isReady } = useAuthReady();
  const [role, setRole] = useState<"super_admin" | "admin" | null>(null);
  const [session, setSession] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [activeView, setActiveView] = useState<ActiveView>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileUsername, setProfileUsername] = useState("");
  const [taskSearchFilter, setTaskSearchFilter] = useState("");

  useEffect(() => {
    if (!isReady) return;
    if (!user) { navigate("/login", { replace: true }); return; }

    const checkAccess = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isSuperAdmin = roles?.some(r => r.role === "super_admin");
      const isAdmin = roles?.some(r => r.role === "admin");

      if (isSuperAdmin) setRole("super_admin");
      else if (isAdmin) setRole("admin");
      else {
        toast({ title: "Access Denied", variant: "destructive" });
        navigate("/dashboard");
        return;
      }

      const { data: prof } = await supabase.from("profiles").select("full_name, username, employee_id").eq("user_id", user.id).maybeSingle();
      if (prof && !prof.employee_id) {
        navigate("/employee-setup");
        return;
      }
      if (prof) {
        setProfileName(prof.full_name);
        setProfileUsername(prof.username);
      }
    };
    checkAccess();
  }, [navigate, toast, isReady, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (!isReady) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  if (!role || !session) return null;

  const navItems: { id: ActiveView; icon: any; title: string; mobileTitle?: string; adminOnly?: boolean }[] = [
    { id: "home", icon: LayoutDashboard, title: "Dashboard" },
    { id: "tasks", icon: ClipboardList, title: "Tasks", mobileTitle: "Task Management" },
    { id: "chat", icon: MessageCircle, title: "Messages" },
    { id: "attendance", icon: CalendarCheck, title: "Attendance" },
    { id: "announcements", icon: Megaphone, title: "Announcements" },
    { id: "shifts", icon: Clock, title: "Shifts" },
    { id: "assets", icon: Package, title: "Assets" },
    { id: "payroll", icon: DollarSign, title: "Payroll" },
    { id: "logs", icon: ScrollText, title: "Logs" },
    { id: "users", icon: UserCog, title: "Users" },
    ...(role === "super_admin" ? [{ id: "otp" as ActiveView, icon: KeyRound, title: "OTP" }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={officeLogo} alt="Office Management" className="h-8 w-8 rounded-full object-cover" />
            <div className="text-left">
              <p className="text-sm font-bold text-foreground">
                {profileName || (role === "super_admin" ? "Super Admin" : "Admin")}
              </p>
              {profileUsername && <p className="text-[10px] text-muted-foreground">@{profileUsername}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
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
        <div className="mb-4 hidden md:flex gap-2 flex-wrap">
          {navItems.map(item => (
            <Button
              key={item.id}
              variant={activeView === item.id ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setActiveView(item.id)}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Button>
          ))}
        </div>
        {mobileMenuOpen && (
          <div className="mb-4 grid grid-cols-3 gap-2 md:hidden">
            {navItems.map(item => (
              <Button
                key={item.id}
                variant={activeView === item.id ? "default" : "outline"}
                className="flex-col gap-1 h-16 text-xs"
                onClick={() => { setActiveView(item.id); setMobileMenuOpen(false); }}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Button>
            ))}
          </div>
        )}

        <div className="mb-3 flex items-center justify-center gap-2 md:hidden">
          {(() => {
            const t = navItems.find(t => t.id === activeView);
            if (!t) return null;
            return (
              <span className="text-xs font-semibold text-muted-foreground">
                {t.mobileTitle || t.title}
              </span>
            );
          })()}
        </div>
        {activeView === "home" && (
          <div className="space-y-6">
            <AdminDashboardHome userId={session.user.id} role={role} onNavigate={(tab, search) => { setTaskSearchFilter(search || ""); setActiveView(tab as ActiveView); }} />
            <ExportReports userId={session.user.id} role={role} />
          </div>
        )}
        {activeView === "tasks" && <TaskListView userId={session.user.id} role={role} initialSearch={taskSearchFilter} />}
        {activeView === "chat" && <ChatModule userId={session.user.id} role={role} />}
        {activeView === "attendance" && <AttendanceAdmin userId={session.user.id} role={role} />}
        {activeView === "announcements" && <AnnouncementsModule userId={session.user.id} role={role} />}
        {activeView === "shifts" && <ShiftsModule userId={session.user.id} role={role} />}
        {activeView === "assets" && <AssetsModule userId={session.user.id} role={role} />}
        {activeView === "payroll" && <PayrollModule userId={session.user.id} role={role} />}
        {activeView === "otp" && <OtpSection />}
        {activeView === "users" && <UserManagementSection userId={session.user.id} role={role} />}
        {activeView === "logs" && <ActivityLogsModule userId={session.user.id} role={role} />}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
