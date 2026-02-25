import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";

const BusinessLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentBusiness, getRegisterPath, getDashboardPath, getAppName, businessSlug } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [inputType, setInputType] = useState<"empty" | "username" | "mobile">("empty");
  const [notification, setNotification] = useState<{ message: string; duration: number } | null>(null);
  const [showOkButton, setShowOkButton] = useState(false);
  const [notifId, setNotifId] = useState<string | null>(null);

  const loginSchema = z.object({
    login_id: z.string().trim().min(1, "ইউজারনেম বা মোবাইল নম্বর দিন"),
    password: z.string().min(1, "পাসওয়ার্ড দিন"),
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
    navigate(getDashboardPath());
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
        toast({ title: "ত্রুটি", description: "ইউজার পাওয়া যায়নি", variant: "destructive" });
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: data.password });
      if (authError) {
        toast({ title: "ত্রুটি", description: "ইউজারনেম/মোবাইল বা পাসওয়ার্ড ভুল", variant: "destructive" });
        return;
      }

      if (currentBusiness) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_active, username, business_id")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        if (profile?.business_id !== currentBusiness.id) {
          await supabase.auth.signOut();
          toast({ title: "ত্রুটি", description: "আপনি এই গ্রুপের সদস্য নন", variant: "destructive" });
          return;
        }

        if (!profile?.is_active) {
          await supabase.auth.signOut();
          toast({ title: "অ্যাকাউন্ট নিষ্ক্রিয়", description: "অ্যাডমিনের কাছ থেকে OTP নিয়ে অ্যাকাউন্ট সক্রিয় করুন।", variant: "destructive" });
          navigate(`/${businessSlug}/verify-otp`, { state: { username: profile?.username } });
          return;
        }
      }

      const nId = await checkNotifications(authData.user.id);
      if (nId) { setNotifId(nId); } else { navigate(getDashboardPath()); }
    } catch {
      toast({ title: "ত্রুটি", description: "সার্ভারে সমস্যা", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const themeColor = currentBusiness?.theme_color;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 relative">
      <div className="mb-6 flex flex-col items-center gap-2">
        {currentBusiness?.logo_url ? (
          <img src={currentBusiness.logo_url} alt={getAppName()} className="h-14 w-14 drop-shadow-lg md:h-20 md:w-20 rounded-full object-cover" />
        ) : (
          <div
            className="h-14 w-14 md:h-20 md:w-20 rounded-full flex items-center justify-center text-2xl md:text-3xl font-bold text-white drop-shadow-lg"
            style={{ backgroundColor: themeColor || "hsl(var(--primary))" }}
          >
            {getAppName().charAt(0)}
          </div>
        )}
        <h1 className="text-2xl font-bold md:text-3xl" style={{ color: themeColor }}>
          {getAppName()}
        </h1>
        <p className="text-sm text-muted-foreground">আপনার অ্যাকাউন্টে প্রবেশ করুন</p>
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
                    <FormLabel>ইউজারনেম বা মোবাইল</FormLabel>
                    {inputType !== "empty" && (
                      <Badge variant="secondary" className="gap-1 text-xs font-normal">
                        {inputType === "username" ? (
                          <><User className="h-3 w-3" /> ইউজারনেম</>
                        ) : (
                          <><Phone className="h-3 w-3" /> মোবাইল</>
                        )}
                      </Badge>
                    )}
                  </div>
                  <FormControl>
                    <Input
                      placeholder="ইউজারনেম অথবা মোবাইল নম্বর"
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
                  <FormLabel>পাসওয়ার্ড</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="পাসওয়ার্ড দিন" {...field} />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full font-semibold"
              size="lg"
              disabled={loading}
              style={{ backgroundColor: themeColor }}
            >
              <LogIn className="h-4 w-4" />
              {loading ? "অপেক্ষা করুন..." : "লগইন করুন"}
            </Button>
          </form>
        </Form>
        <div className="mt-4 flex flex-col items-center gap-1.5 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <Link to={getRegisterPath()} className="font-medium hover:underline" style={{ color: themeColor }}>
            রেজিস্ট্রেশন করুন
          </Link>
          <Link to={`/${businessSlug}/verify-otp`} className="font-medium hover:underline" style={{ color: themeColor }}>
            OTP ভেরিফাই
          </Link>
        </div>
      </div>

      <Dialog open={!!notification} onOpenChange={() => {}}>
        <DialogContent className="mx-4 sm:max-w-md [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: themeColor }}>📢 নির্দেশনা</DialogTitle>
            <DialogDescription className="sr-only">অ্যাডমিনের নির্দেশনা</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-foreground whitespace-pre-wrap leading-relaxed">{notification?.message}</div>
          {showOkButton && (
            <div className="flex justify-center">
              <Button onClick={dismissNotification} size="lg" className="px-10 font-semibold" style={{ backgroundColor: themeColor }}>ঠিক আছে</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessLogin;
