import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, KeyRound, UserCog, X, ClipboardList, CalendarCheck, MessageCircle, Megaphone, FileText, Clock, Star, Package, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";
import OtpSection from "@/components/admin/OtpSection";
import UserManagementSection from "@/components/admin/UserManagementSection";
import TaskListView from "@/components/tasks/TaskListView";
import AttendanceAdmin from "@/components/admin/AttendanceAdmin";
import ChatModule from "@/components/chat/ChatModule";
import AdminDashboardHome from "@/components/dashboard/AdminDashboardHome";
import ExportReports from "@/components/dashboard/ExportReports";
import AnnouncementsModule from "@/components/modules/AnnouncementsModule";
import DocumentsModule from "@/components/modules/DocumentsModule";
import ShiftsModule from "@/components/modules/ShiftsModule";
import PerformanceModule from "@/components/modules/PerformanceModule";
import AssetsModule from "@/components/modules/AssetsModule";
import PayrollModule from "@/components/modules/PayrollModule";
import officeLogo from "@/assets/office-logo.png";

type ActiveView = "home" | "otp" | "users" | "tasks" | "attendance" | "chat" | "announcements" | "documents" | "shifts" | "performance" | "assets" | "payroll";

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
        toast({ title: "Access Denied", variant: "destructive" });
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

  const navItems: { id: ActiveView; icon: any; title: string; adminOnly?: boolean }[] = [
    { id: "tasks", icon: ClipboardList, title: "Tasks" },
    { id: "chat", icon: MessageCircle, title: "Messages" },
    { id: "attendance", icon: CalendarCheck, title: "Attendance" },
    { id: "announcements", icon: Megaphone, title: "Announcements" },
    { id: "documents", icon: FileText, title: "Documents" },
    { id: "shifts", icon: Clock, title: "Shifts" },
    { id: "performance", icon: Star, title: "Reviews" },
    { id: "assets", icon: Package, title: "Assets" },
    { id: "payroll", icon: DollarSign, title: "Payroll" },
    { id: "users", icon: UserCog, title: "Users" },
    ...(role === "super_admin" ? [{ id: "otp" as ActiveView, icon: KeyRound, title: "OTP" }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={officeLogo} alt="Office Management" className="h-8 w-8 rounded-full object-cover" />
            <span className="text-lg font-bold text-foreground hidden sm:inline">
              {profileName || (role === "super_admin" ? "Super Admin" : "Admin")}
            </span>
          </div>
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {navItems.map(item => (
              <Button
                key={item.id}
                variant={activeView === item.id ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setActiveView(activeView === item.id ? "home" : item.id)}
                title={item.title}
              >
                <item.icon className="h-4 w-4" />
              </Button>
            ))}
            <ThemeToggle />
            {activeView !== "home" && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveView("home")} title="Back">
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-4">
        {activeView === "home" && (
          <div className="space-y-6">
            <AdminDashboardHome userId={session.user.id} role={role} onNavigate={(tab) => setActiveView(tab as ActiveView)} />
            <ExportReports userId={session.user.id} role={role} />
          </div>
        )}
        {activeView === "tasks" && <TaskListView userId={session.user.id} role={role} />}
        {activeView === "chat" && <ChatModule userId={session.user.id} role={role} />}
        {activeView === "attendance" && <AttendanceAdmin userId={session.user.id} role={role} />}
        {activeView === "announcements" && <AnnouncementsModule userId={session.user.id} role={role} />}
        {activeView === "documents" && <DocumentsModule userId={session.user.id} role={role} />}
        {activeView === "shifts" && <ShiftsModule userId={session.user.id} role={role} />}
        {activeView === "performance" && <PerformanceModule userId={session.user.id} role={role} />}
        {activeView === "assets" && <AssetsModule userId={session.user.id} role={role} />}
        {activeView === "payroll" && <PayrollModule userId={session.user.id} role={role} />}
        {activeView === "otp" && <OtpSection />}
        {activeView === "users" && <UserManagementSection userId={session.user.id} role={role} />}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
