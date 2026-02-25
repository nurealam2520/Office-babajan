import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, User, Phone } from "lucide-react";
import shahzadaLogo from "@/assets/shahzada-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [inputType, setInputType] = useState<"empty" | "username" | "mobile">("empty");
  const [notification, setNotification] = useState<{ message: string; duration: number } | null>(null);
  const [showOkButton, setShowOkButton] = useState(false);
  const [notifId, setNotifId] = useState<string | null>(null);

  const loginSchema = z.object({
    login_id: z.string().trim().min(1, t("login.provide_username_or_mobile")),
    password: z.string().min(1, t("login.provide_password")),
  });

  type LoginForm = z.infer<typeof loginSchema>;

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login_id: "", password: "" },
  });

  function detectInputType(value: string) {
    if (!value.trim()) return "empty";
    if (/^[+]?\d+$/.test(value.trim())) return "mobile";
    return "username";
  }

  const checkNotifications = useCallback(async (userId: string) => {
    const { data: notifications } = await supabase
      .from("login_notifications")
      .select("*")
      .eq("target_user_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (notifications && notifications.length > 0) {
      const notif = notifications[0];
      setNotification({ message: notif.message, duration: notif.display_duration_seconds || 10 });
      setShowOkButton(false);
      setTimeout(() => setShowOkButton(true), (notif.display_duration_seconds || 10) * 1000);
      return notif.id;
    }
    return null;
  }, []);

  const dismissNotification = async () => {
    if (notifId) {
      await supabase.from("login_notifications").update({ is_read: true }).eq("id", notifId);
    }
    setNotification(null);
    navigate("/dashboard");
  };

  const resolveEmail = async (loginId: string): Promise<string | null> => {
    const trimmed = loginId.trim();
    const type = detectInputType(trimmed);
    if (type === "username") return `${trimmed}@myzmessage.app`;
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .or(`mobile_number.eq.${trimmed},mobile_number.eq.+880${trimmed}`)
      .maybeSingle();
    if (profile) return `${profile.username}@myzmessage.app`;
    return null;
  };

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const email = await resolveEmail(data.login_id);
      if (!email) {
        toast({ title: t("error"), description: t("login.user_not_found"), variant: "destructive" });
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: data.password });
      if (authError) {
        toast({ title: t("error"), description: t("login.wrong_credentials"), variant: "destructive" });
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("is_active, username").eq("user_id", authData.user.id).maybeSingle();
      if (!profile?.is_active) {
        await supabase.auth.signOut();
        toast({ title: t("login.account_inactive"), description: t("login.activate_account"), variant: "destructive" });
        navigate("/verify-otp", { state: { username: profile?.username } });
        return;
      }
      const nId = await checkNotifications(authData.user.id);
      if (nId) { setNotifId(nId); } else { navigate("/dashboard"); }
    } catch {
      toast({ title: t("error"), description: t("login.server_error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <div className="mb-6 flex flex-col items-center gap-2">
        <img src={shahzadaLogo} alt="Shahzada's Hub" className="h-16 w-16 rounded-full object-cover drop-shadow-lg md:h-20 md:w-20 border-2 border-primary/20" />
        <h1 className="text-2xl font-bold text-primary md:text-3xl">Shahzada's Hub</h1>
        <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
      </div>

      <div className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-md md:max-w-md md:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="login_id"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("login.username_or_mobile")}</FormLabel>
                    {inputType !== "empty" && (
                      <Badge variant="secondary" className="gap-1 text-xs font-normal">
                        {inputType === "username" ? (
                          <><User className="h-3 w-3" /> {t("login.username")}</>
                        ) : (
                          <><Phone className="h-3 w-3" /> {t("login.mobile")}</>
                        )}
                      </Badge>
                    )}
                  </div>
                  <FormControl>
                    <Input
                      placeholder={t("login.username_or_mobile_placeholder")}
                      {...field}
                      onChange={(e) => { field.onChange(e); setInputType(detectInputType(e.target.value)); }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("login.password")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder={t("login.password_placeholder")} {...field} />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full font-semibold" size="lg" disabled={loading}>
              <LogIn className="h-4 w-4" />
              {loading ? t("wait") : t("login.button")}
            </Button>
          </form>
        </Form>
        <div className="mt-4 flex flex-col items-center gap-1.5 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <Link to="/register" className="font-medium text-primary hover:underline">{t("login.register_link")}</Link>
          <Link to="/verify-otp" className="font-medium text-primary hover:underline">{t("login.otp_link")}</Link>
        </div>
      </div>

      <Dialog open={!!notification} onOpenChange={() => {}}>
        <DialogContent className="mx-4 sm:max-w-md [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center text-primary">{t("login.instruction")}</DialogTitle>
            <DialogDescription className="sr-only">{t("login.admin_instruction")}</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-foreground whitespace-pre-wrap leading-relaxed">{notification?.message}</div>
          {showOkButton && (
            <div className="flex justify-center">
              <Button onClick={dismissNotification} size="lg" className="px-10 font-semibold">{t("ok")}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
