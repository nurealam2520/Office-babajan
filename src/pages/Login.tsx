import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const loginSchema = z.object({
  login_id: z.string().trim().min(1, "ইউজারনেম বা মোবাইল নম্বর দিন"),
  password: z.string().min(1, "পাসওয়ার্ড দিন"),
});

type LoginForm = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState<{ message: string; duration: number } | null>(null);
  const [showOkButton, setShowOkButton] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login_id: "", password: "" },
  });

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
      setNotification({
        message: notif.message,
        duration: notif.display_duration_seconds || 10,
      });
      setShowOkButton(false);

      // Show OK button after duration
      setTimeout(() => {
        setShowOkButton(true);
      }, (notif.display_duration_seconds || 10) * 1000);

      // Mark as read when dismissed
      return notif.id;
    }
    return null;
  }, []);

  const [notifId, setNotifId] = useState<string | null>(null);

  const dismissNotification = async () => {
    if (notifId) {
      await supabase
        .from("login_notifications")
        .update({ is_read: true })
        .eq("id", notifId);
    }
    setNotification(null);
    navigate("/dashboard");
  };

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      // Determine if login_id is username or mobile
      let email = data.login_id;
      if (!email.includes("@")) {
        // Could be username or mobile number
        if (/^[a-zA-Z0-9]+$/.test(data.login_id)) {
          email = `${data.login_id}@myzmessage.app`;
        } else {
          // Try to find by mobile number
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("mobile_number", data.login_id)
            .maybeSingle();

          if (!profile) {
            // Try with common country codes
            const { data: profileWithCode } = await supabase
              .from("profiles")
              .select("username")
              .or(`mobile_number.eq.+880${data.login_id},mobile_number.eq.${data.login_id}`)
              .maybeSingle();

            if (profileWithCode) {
              email = `${profileWithCode.username}@myzmessage.app`;
            } else {
              toast({ title: "ত্রুটি", description: "ইউজার পাওয়া যায়নি", variant: "destructive" });
              setLoading(false);
              return;
            }
          } else {
            email = `${profile.username}@myzmessage.app`;
          }
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: data.password,
      });

      if (authError) {
        toast({ title: "ত্রুটি", description: "ইউজারনেম বা পাসওয়ার্ড ভুল", variant: "destructive" });
        return;
      }

      // Check if account is active
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active, username")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (!profile?.is_active) {
        await supabase.auth.signOut();
        toast({
          title: "অ্যাকাউন্ট নিষ্ক্রিয়",
          description: "আপনার অ্যাকাউন্ট এখনো সক্রিয় হয়নি। অ্যাডমিনের কাছ থেকে OTP নিন।",
          variant: "destructive",
        });
        navigate("/verify-otp", { state: { username: profile?.username } });
        return;
      }

      // Check for notifications
      const nId = await checkNotifications(authData.user.id);
      if (nId) {
        setNotifId(nId);
      } else {
        navigate("/dashboard");
      }
    } catch {
      toast({ title: "ত্রুটি", description: "সার্ভারে সমস্যা", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-6 flex flex-col items-center gap-2">
        <img src={logo} alt="মাইজমেসেজ" className="h-16 w-16 drop-shadow-lg" />
        <h1 className="text-2xl font-bold text-primary">লগইন</h1>
        <p className="text-sm text-muted-foreground">আপনার অ্যাকাউন্টে প্রবেশ করুন</p>
      </div>

      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="login_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ইউজারনেম বা মোবাইল নম্বর</FormLabel>
                  <FormControl>
                    <Input placeholder="ইউজারনেম অথবা মোবাইল নম্বর" {...field} />
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
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="পাসওয়ার্ড দিন"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
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
              {loading ? "অপেক্ষা করুন..." : "লগইন করুন"}
            </Button>
          </form>
        </Form>

        <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
          <div>
            অ্যাকাউন্ট নেই?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              রেজিস্ট্রেশন করুন
            </Link>
          </div>
          <div>
            OTP দিতে হবে?{" "}
            <Link to="/verify-otp" className="font-medium text-primary hover:underline">
              ভেরিফাই করুন
            </Link>
          </div>
        </div>
      </div>

      {/* Admin Notification Popup */}
      <Dialog open={!!notification} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center text-primary">📢 নির্দেশনা</DialogTitle>
            <DialogDescription className="sr-only">অ্যাডমিনের নির্দেশনা</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-foreground whitespace-pre-wrap leading-relaxed">
            {notification?.message}
          </div>
          {showOkButton && (
            <div className="flex justify-center">
              <Button onClick={dismissNotification} size="lg" className="px-10 font-semibold">
                ঠিক আছে
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
