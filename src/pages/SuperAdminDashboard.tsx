import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShieldCheck, MessageSquare, ClipboardList, Users, MapPin, FileText, Wallet,
  LogOut, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";
import PopupNotification from "@/components/PopupNotification";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import OtpSection from "@/components/admin/OtpSection";
import MessageSection from "@/components/admin/MessageSection";
import TaskSection from "@/components/admin/TaskSection";
import UserManagementSection from "@/components/admin/UserManagementSection";
import ReportSection from "@/components/admin/ReportSection";
import LocationSection from "@/components/admin/LocationSection";
import CollectionReportSection from "@/components/admin/CollectionReportSection";
import { useBusiness } from "@/contexts/BusinessContext";
import shahzadaLogo from "@/assets/shahzada-logo.png";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [role, setRole] = useState<"super_admin" | "admin" | null>(null);
  const [session, setSession] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [activeTab, setActiveTab] = useState("messages");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const { allBusinesses, selectedAdminBusiness, setSelectedAdminBusiness } = useBusiness();

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
        toast({ title: t("permission_denied"), variant: "destructive" });
        navigate("/dashboard");
        return;
      }

      const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", s.user.id).maybeSingle();
      if (prof) setProfileName(prof.full_name);

      // Show welcome popup for super_admin/admin
      if (isSuperAdmin || isAdmin) {
        setShowWelcome(true);
        setTimeout(() => setShowWelcome(false), 5000);
      }
    };
    checkAccess();
  }, [navigate, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (!role || !session) return null;

  const tabs = [
    ...(role === "super_admin" ? [{ id: "otp", label: t("nav.otp"), icon: ShieldCheck }] : []),
    { id: "messages", label: t("nav.messages"), icon: MessageSquare },
    { id: "tasks", label: t("nav.tasks"), icon: ClipboardList },
    { id: "users", label: t("nav.users"), icon: Users },
    { id: "reports", label: t("nav.reports"), icon: FileText },
    { id: "collections", label: t("nav.collection"), icon: Wallet },
    { id: "location", label: t("nav.location"), icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={shahzadaLogo} alt="Shahzada's Hub" className="h-8 w-8 rounded-full object-cover" />
            <span className="text-lg font-bold text-foreground">
              {profileName || (role === "super_admin" ? t("role.super_admin") : t("role.admin"))}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
            {role !== "super_admin" && <NotificationBell userId={session.user.id} />}
            {activeTab !== (role === "super_admin" ? "otp" : "messages") && (
              <Button variant="ghost" size="icon" onClick={() => setActiveTab(role === "super_admin" ? "otp" : "messages")} title={t("nav.return_main")}>
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

      <div className="mx-auto max-w-7xl px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Desktop Tabs */}
          <TabsList className="mb-4 hidden w-full justify-start gap-1 overflow-x-auto md:flex">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
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
                </Button>
              ))}
            </div>
          )}

          {/* Mobile current tab indicator */}
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

          {role === "super_admin" && (
            <TabsContent value="otp">
              <OtpSection />
            </TabsContent>
          )}
          <TabsContent value="messages">
            <MessageSection userId={session.user.id} role={role} />
          </TabsContent>
          <TabsContent value="tasks">
            <TaskSection userId={session.user.id} role={role} />
          </TabsContent>
          <TabsContent value="users">
            <UserManagementSection userId={session.user.id} role={role} />
          </TabsContent>
          <TabsContent value="reports">
            {/* Business Switcher Bar */}
            <div className="mb-4 flex gap-2">
              <Button
                variant={!selectedAdminBusiness ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAdminBusiness(null)}
              >
                সব
              </Button>
              {allBusinesses.map(b => (
                <Button
                  key={b.id}
                  variant={selectedAdminBusiness?.id === b.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedAdminBusiness(b)}
                  style={selectedAdminBusiness?.id === b.id ? { backgroundColor: b.theme_color || undefined } : { borderColor: b.theme_color || undefined, color: b.theme_color || undefined }}
                >
                  {b.name}
                </Button>
              ))}
            </div>
            <ReportSection userId={session.user.id} />
          </TabsContent>
          <TabsContent value="collections">
            <CollectionReportSection />
          </TabsContent>
          <TabsContent value="location">
            <LocationSection />
          </TabsContent>
        </Tabs>
      </div>
      <PopupNotification userId={session.user.id} />

      {/* Welcome Popup */}
      {showWelcome && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowWelcome(false)}
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
