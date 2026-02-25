import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, MessageSquare, Wallet, Users, LogOut, Menu, X, User, AlertTriangle, CheckCircle2,
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
import PopupNotification from "@/components/PopupNotification";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBusiness } from "@/contexts/BusinessContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { currentBusiness, getLoginPath, getAppName, businessSlug } = useBusiness();
  const [profile, setProfile] = useState<{ full_name: string; username: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [todayCollection, setTodayCollection] = useState(0);

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

      // Get active task count & overdue
      const { data: activeTasks } = await supabase
        .from("tasks")
        .select("id, due_date, status")
        .eq("assigned_to", session.user.id)
        .neq("status", "completed");
      setTaskCount(activeTasks?.length || 0);
      setOverdueCount(activeTasks?.filter(t => t.due_date && new Date(t.due_date).getTime() < Date.now()).length || 0);

      // Unread messages
      const { count: msgCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", session.user.id);
      setUnreadMsgCount(msgCount || 0);

      // Today's collection
      const today = new Date().toISOString().split("T")[0];
      const { data: todayCols } = await supabase
        .from("collections")
        .select("amount")
        .eq("user_id", session.user.id)
        .eq("collection_date", today);
      setTodayCollection(todayCols?.reduce((s, c) => s + parseFloat(c.amount as any), 0) || 0);
    };
    checkAuth();
  }, [navigate]);

  // Real-time updates for tasks
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

  if (!userId) return null;

  const tabs = [
    { id: "tasks", label: t("nav.tasks"), icon: ClipboardList, badge: taskCount },
    { id: "messages", label: t("nav.messages"), icon: MessageSquare },
    { id: "collection", label: t("nav.collection"), icon: Wallet },
    { id: "team", label: t("nav.team"), icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-foreground leading-none">
                {profile?.full_name || getAppName()}
              </p>
              {profile && <p className="text-[10px] text-muted-foreground">@{profile.username}</p>}
            </div>
          </div>

          {/* Status Micro-Hero - Desktop */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                overdueCount > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
              }`}
            >
              {overdueCount > 0 ? <AlertTriangle className="h-3 w-3" /> : <ClipboardList className="h-3 w-3" />}
              {taskCount > 0 ? `${taskCount} ${t("stats.tasks")}` : t("stats.no_tasks")}
              {overdueCount > 0 && <span className="font-bold">({overdueCount} {t("stats.overdue")})</span>}
            </button>
            {unreadMsgCount > 0 && (
              <button
                onClick={() => setActiveTab("messages")}
                className="flex items-center gap-1.5 rounded-full bg-accent/15 text-accent-foreground px-3 py-1 text-xs font-medium"
              >
                <MessageSquare className="h-3 w-3" />
                {unreadMsgCount} {t("stats.messages")}
              </button>
            )}
            {todayCollection > 0 && (
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
            <LanguageToggle />
            <ThemeToggle />
            <NotificationCenter userId={userId} />
            {activeTab !== "tasks" && (
              <Button variant="ghost" size="icon" onClick={() => setActiveTab("tasks")} title={t("nav.return_main")}>
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

      <div className="mx-auto max-w-5xl px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Desktop Tabs */}
          <TabsList className="mb-4 hidden w-full justify-start gap-1 md:flex">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.badge ? <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{tab.badge}</Badge> : null}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Mobile Menu */}
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

          {/* Mobile current tab */}
          <div className="mb-4 flex items-center gap-2 md:hidden">
            {(() => {
              const t = tabs.find(t => t.id === activeTab);
              if (!t) return null;
              return (
                <Button variant="secondary" size="sm" className="gap-2 pointer-events-none">
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </Button>
              );
            })()}
          </div>

          <TabsContent value="tasks">
            <MyTasks userId={userId} />
          </TabsContent>
          <TabsContent value="messages">
            <MemberMessages userId={userId} />
          </TabsContent>
          <TabsContent value="collection">
            <CollectionSection userId={userId} />
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
