import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, MessageSquare, Wallet, Users, LogOut, Menu, X, User, AlertTriangle, CheckCircle2, ArrowLeftRight, CalendarCheck, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import MyTasks from "@/components/member/MyTasks";
import MemberMessages from "@/components/member/MemberMessages";
import CollectionSection from "@/components/member/CollectionSection";
import TeamSection from "@/components/member/TeamSection";
import NotificationCenter from "@/components/member/NotificationCenter";
import MemberAttendance from "@/components/member/MemberAttendance";
import AttendanceCalendar from "@/components/member/AttendanceCalendar";
import ReportHistory from "@/components/member/ReportHistory";
import DashboardSummaryCards from "@/components/member/DashboardSummaryCards";
import OfficeWelcomeOverlay from "@/components/member/OfficeWelcomeOverlay";
import PopupNotification from "@/components/PopupNotification";
import ThemeToggle from "@/components/ThemeToggle";
import { useBusiness } from "@/contexts/BusinessContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentBusiness, getLoginPath, getAppName, businessSlug, userBusinesses, activeBusiness, setActiveBusiness, loadUserBusinesses } = useBusiness();
  const [profile, setProfile] = useState<{ full_name: string; username: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [todayCollection, setTodayCollection] = useState(0);
  const [autoCheckIn, setAutoCheckIn] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);

  const isOffice = activeBusiness?.slug === "office";

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate(getLoginPath()); return; }
      setUserId(session.user.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const isAdminUser = roles?.some(r => r.role === "admin" || r.role === "super_admin");
      if (isAdminUser) { navigate("/admin"); return; }
      const isManager = roles?.some(r => r.role === "manager");
      if (isManager) { navigate("/manager"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setProfile(data);

      loadUserBusinesses(session.user.id);

      const { data: activeTasks } = await supabase
        .from("tasks")
        .select("id, due_date, status")
        .eq("assigned_to", session.user.id)
        .neq("status", "completed");
      setTaskCount(activeTasks?.length || 0);
      setOverdueCount(activeTasks?.filter(t => t.due_date && new Date(t.due_date).getTime() < Date.now()).length || 0);

      const { count: msgCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", session.user.id);
      setUnreadMsgCount(msgCount || 0);

      const today = new Date().toISOString().split("T")[0];
      const { data: todayCols } = await supabase
        .from("collections")
        .select("amount")
        .eq("user_id", session.user.id)
        .eq("collection_date", today);
      setTodayCollection(todayCols?.reduce((s, c) => s + parseFloat(c.amount as any), 0) || 0);

      // Check if already checked in today
      const { data: todayAtt } = await supabase
        .from("attendance")
        .select("id")
        .eq("user_id", session.user.id)
        .gte("created_at", today)
        .limit(1);
      setHasCheckedInToday((todayAtt?.length || 0) > 0);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`dashboard-status-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `assigned_to=eq.${userId}` }, async () => {
        const { data } = await supabase.from("tasks").select("id, due_date, status").eq("assigned_to", userId).neq("status", "completed");
        setTaskCount(data?.length || 0);
        setOverdueCount(data?.filter(t => t.due_date && new Date(t.due_date).getTime() < Date.now()).length || 0);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` }, () => {
        setUnreadMsgCount(prev => prev + 1);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "collections", filter: `user_id=eq.${userId}` }, async () => {
        const today = new Date().toISOString().split("T")[0];
        const { data } = await supabase.from("collections").select("amount").eq("user_id", userId).eq("collection_date", today);
        setTodayCollection(data?.reduce((s, c) => s + parseFloat(c.amount as any), 0) || 0);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(getLoginPath());
  };

  const handleWelcomeAttendance = () => {
    setActiveTab("attendance");
    setAutoCheckIn(true);
  };

  if (!userId) return null;

  // Filter tabs based on business
  const allTabs = [
    { id: "tasks", label: "টাস্ক", icon: ClipboardList, badge: taskCount },
    { id: "attendance", label: "অ্যাটেন্ডেন্স", icon: CalendarCheck },
    { id: "messages", label: "মেসেজ", icon: MessageSquare },
    { id: "collection", label: "কালেকশন", icon: Wallet, hideForOffice: true },
    { id: "reports", label: "রিপোর্ট", icon: FileText },
    { id: "team", label: "টিম", icon: Users },
  ];

  const tabs = isOffice ? allTabs.filter(t => !t.hideForOffice) : allTabs;

  return (
    <div className="min-h-screen bg-background">
      {/* Office Welcome Overlay */}
      {isOffice && profile && (
        <OfficeWelcomeOverlay
          fullName={profile.full_name}
          onStartAttendance={handleWelcomeAttendance}
          hasCheckedInToday={hasCheckedInToday}
        />
      )}

      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">
                {profile?.full_name || getAppName()}
              </p>
              {profile && <p className="text-[10px] text-muted-foreground hidden sm:block">@{profile.username}</p>}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                overdueCount > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
              }`}
            >
              {overdueCount > 0 ? <AlertTriangle className="h-3 w-3" /> : <ClipboardList className="h-3 w-3" />}
              {taskCount > 0 ? `${taskCount} টাস্ক` : "কোন টাস্ক নেই"}
              {overdueCount > 0 && <span className="font-bold">({overdueCount} ওভারডিউ)</span>}
            </button>
            {unreadMsgCount > 0 && (
              <button
                onClick={() => setActiveTab("messages")}
                className="flex items-center gap-1.5 rounded-full bg-accent/15 text-accent-foreground px-3 py-1 text-xs font-medium"
              >
                <MessageSquare className="h-3 w-3" />
                {unreadMsgCount} মেসেজ
              </button>
            )}
            {!isOffice && todayCollection > 0 && (
              <button
                onClick={() => setActiveTab("collection")}
                className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
              >
                <Wallet className="h-3 w-3" />
                ৳{todayCollection.toLocaleString("bn-BD")}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationCenter userId={userId} />
            {activeTab !== "tasks" && (
              <Button variant="ghost" size="icon" onClick={() => setActiveTab("tasks")} title="মূল ট্যাবে ফিরুন">
                <X className="h-5 w-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {userBusinesses.length > 1 && (
        <div className="sticky top-[57px] z-30 border-b bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground shrink-0">গ্রুপ:</span>
            {userBusinesses.map(b => (
              <Button
                key={b.id}
                variant={activeBusiness?.id === b.id ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActiveBusiness(b)}
                style={activeBusiness?.id === b.id ? { backgroundColor: b.theme_color || undefined } : { borderColor: b.theme_color || undefined, color: b.theme_color || undefined }}
              >
                {b.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-4">
        {activeBusiness && userBusinesses.length > 1 && (
          <div className="mb-3 rounded-lg border px-3 py-2 text-xs text-muted-foreground" style={{ borderColor: activeBusiness.theme_color || undefined }}>
            📌 বর্তমান গ্রুপ: <span className="font-semibold text-foreground">{activeBusiness.name}</span> — শুধু এই গ্রুপের কাজ দেখাচ্ছে
          </div>
        )}
        <DashboardSummaryCards userId={userId} businessId={activeBusiness?.id || null} onNavigate={setActiveTab} isOffice={isOffice} />
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 hidden w-full justify-start gap-1 md:flex">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.badge ? <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{tab.badge}</Badge> : null}
              </TabsTrigger>
            ))}
          </TabsList>

          {mobileMenuOpen && (
            <div className="mb-4 grid grid-cols-2 gap-2 md:hidden">
              {tabs.map(tab => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "outline"}
                  className="justify-start gap-2"
                  onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.badge ? <Badge variant="secondary" className="ml-auto text-[10px]">{tab.badge}</Badge> : null}
                </Button>
              ))}
            </div>
          )}

          <div className="mb-4 flex items-center gap-2 md:hidden">
            {(() => {
              const currentTab = tabs.find(t => t.id === activeTab);
              if (!currentTab) return null;
              return (
                <Button variant="secondary" size="sm" className="gap-2 pointer-events-none">
                  <currentTab.icon className="h-4 w-4" />
                  {currentTab.label}
                </Button>
              );
            })()}
          </div>

          <TabsContent value="tasks">
            <MyTasks userId={userId} businessId={activeBusiness?.id || null} />
          </TabsContent>
          <TabsContent value="attendance">
            <div className="space-y-6">
              <MemberAttendance
                userId={userId}
                businessId={activeBusiness?.id || null}
                autoCheckIn={autoCheckIn}
                onCheckedIn={() => {
                  setAutoCheckIn(false);
                  setHasCheckedInToday(true);
                  // After check-in, switch to tasks tab
                  setTimeout(() => setActiveTab("tasks"), 1500);
                }}
              />
              <AttendanceCalendar userId={userId} businessId={activeBusiness?.id || null} />
            </div>
          </TabsContent>
          <TabsContent value="messages">
            <MemberMessages userId={userId} businessId={activeBusiness?.id || null} />
          </TabsContent>
          {!isOffice && (
            <TabsContent value="collection">
              <CollectionSection userId={userId} businessId={activeBusiness?.id || null} />
            </TabsContent>
          )}
          <TabsContent value="reports">
            <ReportHistory userId={userId} />
          </TabsContent>
          <TabsContent value="team">
            <TeamSection userId={userId} />
          </TabsContent>
        </Tabs>
      </div>

      <PopupNotification userId={userId} />
    </div>
  );
};

export default Dashboard;
