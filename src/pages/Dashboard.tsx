import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, MessageSquare, Wallet, Users, LogOut, Menu, X, User,
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

      // Get active task count
      const { count } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", session.user.id)
        .neq("status", "completed");
      setTaskCount(count || 0);
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (!userId) return null;

  const tabs = [
    { id: "tasks", label: "টাস্ক", icon: ClipboardList, badge: taskCount },
    { id: "messages", label: "মেসেজ", icon: MessageSquare },
    { id: "collection", label: "কালেকশন", icon: Wallet },
    { id: "team", label: "টিম", icon: Users },
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
                {profile?.full_name || "ড্যাশবোর্ড"}
              </p>
              {profile && <p className="text-[10px] text-muted-foreground">@{profile.username}</p>}
            </div>
          </div>

          {/* Status Micro-Hero */}
          {taskCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
              <ClipboardList className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">{taskCount} সক্রিয় টাস্ক</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationCenter userId={userId} />
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
