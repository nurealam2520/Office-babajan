import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, MessageSquare, ClipboardList, FileText, Users, LogOut, Menu, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MessageSection from "@/components/admin/MessageSection";
import TaskSection from "@/components/admin/TaskSection";
import ReportSection from "@/components/admin/ReportSection";
import UserManagementSection from "@/components/admin/UserManagementSection";
import NotificationBell from "@/components/NotificationBell";
import PopupNotification from "@/components/PopupNotification";
import ThemeToggle from "@/components/ThemeToggle";

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [verified, setVerified] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [activeTab, setActiveTab] = useState("messages");
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
        toast({ title: "অনুমতি নেই", variant: "destructive" });
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

  const tabs = [
    { id: "messages", label: "মেসেজ", icon: MessageSquare },
    { id: "tasks", label: "টাস্ক", icon: ClipboardList },
    { id: "users", label: "ইউজার", icon: Users },
    { id: "reports", label: "রিপোর্ট", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground">
              {profileName || "ম্যানেজার প্যানেল"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell userId={session.user.id} />
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 hidden w-full justify-start gap-1 md:flex">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
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
                </Button>
              ))}
            </div>
          )}

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

          <TabsContent value="messages">
            <MessageSection userId={session.user.id} role="manager" />
          </TabsContent>
          <TabsContent value="tasks">
            <TaskSection userId={session.user.id} role="manager" />
          </TabsContent>
          <TabsContent value="users">
            <UserManagementSection userId={session.user.id} role="manager" />
          </TabsContent>
          <TabsContent value="reports">
            <ReportSection userId={session.user.id} />
          </TabsContent>
        </Tabs>
      </div>
      <PopupNotification userId={session.user.id} />
    </div>
  );
};

export default ManagerDashboard;
