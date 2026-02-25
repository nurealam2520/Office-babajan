import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShieldCheck, MessageSquare, ClipboardList, Users, MapPin, FileText, Wallet,
  LogOut, Menu, X, KeyRound, UserCog, CalendarDays, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import NotificationBell from "@/components/NotificationBell";
import PopupNotification from "@/components/PopupNotification";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import OtpSection from "@/components/admin/OtpSection";
import MessageSection from "@/components/admin/MessageSection";
import TaskSection from "@/components/admin/TaskSection";
import UserManagementSection from "@/components/admin/UserManagementSection";
import ReportSection from "@/components/admin/ReportSection";
import LocationSection from "@/components/admin/LocationSection";
import CollectionReportSection from "@/components/admin/CollectionReportSection";
import AttendanceSection from "@/components/office/AttendanceSection";
import TaskCalendarSection from "@/components/office/TaskCalendarSection";
import TaskDeadlineSection from "@/components/office/TaskDeadlineSection";
import TaskStatusSection from "@/components/office/TaskStatusSection";
import { useBusiness } from "@/contexts/BusinessContext";
import shahzadaLogo from "@/assets/shahzada-logo.png";

type ActiveView = "home" | "otp" | "users" | "messages" | "tasks" | "reports" | "collections" | "location" | "office-daily-task" | "office-daily-report" | "office-attendance" | "office-calendar" | "office-deadline" | "office-status";
type BusinessTab = "dorbar" | "office";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [role, setRole] = useState<"super_admin" | "admin" | null>(null);
  const [session, setSession] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [activeView, setActiveView] = useState<ActiveView>("home");
  const [activeBusinessTab, setActiveBusinessTab] = useState<BusinessTab>("dorbar");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const { allBusinesses, selectedAdminBusiness, setSelectedAdminBusiness } = useBusiness();

  // Stats
  const [pendingOtpCount, setPendingOtpCount] = useState(0);
  const [dorbarTaskSubmitted, setDorbarTaskSubmitted] = useState(0);
  const [officeTaskSubmitted, setOfficeTaskSubmitted] = useState(0);
  const [dorbar24hCollection, setDorbar24hCollection] = useState(0);

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

      // Welcome popup: show only on first use or after 1 hour gap
      const lastWelcome = localStorage.getItem("admin-welcome-ts");
      const now = Date.now();
      if (!lastWelcome || (now - parseInt(lastWelcome)) > 3600000) {
        setShowWelcome(true);
        localStorage.setItem("admin-welcome-ts", now.toString());
        setTimeout(() => setShowWelcome(false), 5000);
      }

      // Fetch stats
      fetchStats();
    };
    checkAccess();
  }, [navigate, toast]);

  const fetchStats = async () => {
    // Pending OTP users
    const { count: otpCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_active", false);
    setPendingOtpCount(otpCount || 0);

    // Find dorbar and office business IDs
    const { data: bizList } = await supabase.from("businesses").select("id, slug").eq("is_active", true);
    const dorbarBiz = bizList?.find(b => b.slug === "dorbar");
    const officeBiz = bizList?.find(b => b.slug === "office");

    // Task reports submitted count by business
    if (dorbarBiz) {
      const { count } = await supabase
        .from("task_reports")
        .select("*, tasks!inner(business_id)", { count: "exact", head: true })
        .eq("tasks.business_id", dorbarBiz.id);
      setDorbarTaskSubmitted(count || 0);
    }
    if (officeBiz) {
      const { count } = await supabase
        .from("task_reports")
        .select("*, tasks!inner(business_id)", { count: "exact", head: true })
        .eq("tasks.business_id", officeBiz.id);
      setOfficeTaskSubmitted(count || 0);
    }

    // Dorbar 24h collection
    if (dorbarBiz) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const { data: cols } = await supabase
        .from("collections")
        .select("amount")
        .eq("business_id", dorbarBiz.id)
        .gte("collection_date", yesterday);
      setDorbar24hCollection(cols?.reduce((s, c) => s + parseFloat(c.amount as any), 0) || 0);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const dismissWelcome = () => setShowWelcome(false);

  if (!role || !session) return null;

  // When clicking dorbar tab, set the business context to dorbar
  const handleBusinessTabChange = (tab: BusinessTab) => {
    setActiveBusinessTab(tab);
    setActiveView("home");
    const biz = allBusinesses.find(b => b.slug === tab);
    if (biz) setSelectedAdminBusiness(biz);
    else setSelectedAdminBusiness(null);
  };

  const dorbarSubTabs = [
    { id: "messages" as ActiveView, label: "মেসেজ", icon: MessageSquare },
    { id: "tasks" as ActiveView, label: "টাস্ক", icon: ClipboardList },
    { id: "reports" as ActiveView, label: "রিপোর্ট", icon: FileText },
    { id: "collections" as ActiveView, label: "কালেকশন", icon: Wallet },
    { id: "location" as ActiveView, label: "লোকেশন", icon: MapPin },
  ];

  const officeSubTabs = [
    { id: "office-daily-task" as ActiveView, label: "ডেইলি টাস্ক", icon: ClipboardList },
    { id: "office-daily-report" as ActiveView, label: "ডেইলি রিপোর্ট", icon: FileText },
    { id: "office-attendance" as ActiveView, label: "অ্যাটেন্ডেন্স", icon: Users },
    { id: "office-calendar" as ActiveView, label: "টাস্ক ক্যালেন্ডার", icon: CalendarDays },
    { id: "office-deadline" as ActiveView, label: "ডেডলাইন", icon: Clock },
    { id: "office-status" as ActiveView, label: "টাস্ক স্ট্যাটাস", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={shahzadaLogo} alt="Shahzada's Hub" className="h-8 w-8 rounded-full object-cover" />
            <span className="text-lg font-bold text-foreground">
              {profileName || (role === "super_admin" ? "সুপার অ্যাডমিন" : "অ্যাডমিন")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* OTP icon button */}
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
            {/* Users icon button */}
            <Button
              variant={activeView === "users" ? "default" : "ghost"}
              size="icon"
              onClick={() => setActiveView(activeView === "users" ? "home" : "users")}
              title="ইউজার ম্যানেজমেন্ট"
            >
              <UserCog className="h-5 w-5" />
            </Button>
            <ThemeToggle />
            {role !== "super_admin" && <NotificationBell userId={session.user.id} />}
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
        {/* OTP Section (full page when selected) */}
        {activeView === "otp" && (
          <OtpSection />
        )}

        {/* Users Section (full page when selected) */}
        {activeView === "users" && (
          <UserManagementSection userId={session.user.id} role={role} />
        )}

        {/* Home / Business views */}
        {(activeView === "home" || !["otp", "users"].includes(activeView)) && activeView !== "otp" && activeView !== "users" && (
          <>
            {/* Summary Stats Cards (only on home) */}
            {activeView === "home" && (
              <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { if (role === "super_admin") setActiveView("otp"); }}>
                  <CardContent className="py-4 text-center">
                    <p className="text-xs text-muted-foreground">OTP অপেক্ষমাণ</p>
                    <p className="text-2xl font-bold text-primary">{pendingOtpCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <p className="text-xs text-muted-foreground">দরবার রিপোর্ট জমা</p>
                    <p className="text-2xl font-bold text-foreground">{dorbarTaskSubmitted}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <p className="text-xs text-muted-foreground">অফিস রিপোর্ট জমা</p>
                    <p className="text-2xl font-bold text-foreground">{officeTaskSubmitted}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <p className="text-xs text-muted-foreground">দরবার কালেকশন (২৪ ঘণ্টা)</p>
                    <p className="text-2xl font-bold text-primary">৳{dorbar24hCollection.toLocaleString("bn-BD")}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Business Tabs - Dorbar / Office */}
            <div className="mb-4 flex gap-2">
              <Button
                size="lg"
                className={`flex-1 text-base font-bold ${activeBusinessTab === "dorbar" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-100 text-green-800 hover:bg-green-200 border border-green-300"}`}
                onClick={() => handleBusinessTabChange("dorbar")}
              >
                দরবার
              </Button>
              <Button
                size="lg"
                className={`flex-1 text-base font-bold ${activeBusinessTab === "office" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-100 text-green-800 hover:bg-green-200 border border-green-300"}`}
                onClick={() => handleBusinessTabChange("office")}
              >
                অফিস
              </Button>
            </div>

            {/* Dorbar Content */}
            {activeBusinessTab === "dorbar" && (
              <>
                {activeView === "home" && (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                    {dorbarSubTabs.map(tab => (
                      <Button
                        key={tab.id}
                        variant="outline"
                        className="h-20 flex-col gap-2 text-sm font-medium hover:bg-primary/10 hover:border-primary/30"
                        onClick={() => setActiveView(tab.id)}
                      >
                        <tab.icon className="h-6 w-6 text-primary" />
                        {tab.label}
                      </Button>
                    ))}
                  </div>
                )}

                {activeView === "messages" && (
                  <MessageSection userId={session.user.id} role={role} />
                )}
                {activeView === "tasks" && (
                  <TaskSection userId={session.user.id} role={role} businessId={selectedAdminBusiness?.id || null} />
                )}
                {activeView === "reports" && (
                  <ReportSection userId={session.user.id} />
                )}
                {activeView === "collections" && (
                  <CollectionReportSection />
                )}
                {activeView === "location" && (
                  <LocationSection />
                )}
              </>
            )}

            {/* Office Content */}
            {activeBusinessTab === "office" && (
              <>
                {activeView === "home" && (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                    {officeSubTabs.map(tab => (
                      <Button
                        key={tab.id}
                        variant="outline"
                        className="h-20 flex-col gap-2 text-sm font-medium hover:bg-primary/10 hover:border-primary/30"
                        onClick={() => setActiveView(tab.id)}
                      >
                        <tab.icon className="h-6 w-6 text-primary" />
                        {tab.label}
                      </Button>
                    ))}
                  </div>
                )}

                {activeView === "office-daily-task" && (
                  <TaskSection userId={session.user.id} role={role} businessId={selectedAdminBusiness?.id || null} />
                )}
                {activeView === "office-daily-report" && (
                  <ReportSection userId={session.user.id} />
                )}
                {activeView === "office-attendance" && (
                  <AttendanceSection userId={session.user.id} role={role} businessId={selectedAdminBusiness?.id || null} />
                )}
                {activeView === "office-calendar" && (
                  <TaskCalendarSection userId={session.user.id} businessId={selectedAdminBusiness?.id || null} />
                )}
                {activeView === "office-deadline" && (
                  <TaskDeadlineSection userId={session.user.id} businessId={selectedAdminBusiness?.id || null} />
                )}
                {activeView === "office-status" && (
                  <TaskStatusSection userId={session.user.id} businessId={selectedAdminBusiness?.id || null} />
                )}
              </>
            )}
          </>
        )}
      </div>

      <PopupNotification userId={session.user.id} />

      {/* Welcome Popup */}
      {showWelcome && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={dismissWelcome}
        >
          <div className="mx-4 max-w-sm rounded-2xl bg-card p-8 text-center shadow-2xl border animate-in fade-in zoom-in-95 duration-300">
            <img src={shahzadaLogo} alt="" className="mx-auto mb-4 h-20 w-20 rounded-full object-cover shadow-lg border-2 border-primary/30" />
            <p className="text-lg font-semibold text-foreground leading-relaxed">
              সম্মানিত শাহজাদা সৈয়দ সহিদউদ্দীন,<br />
              আপনার কর্মক্ষেত্রে স্বাগতম!
            </p>
            <p className="mt-3 text-xs text-muted-foreground">স্ক্রিনে ট্যাপ করুন অথবা ৫ সেকেন্ড অপেক্ষা করুন</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
