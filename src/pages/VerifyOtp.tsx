import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ShieldCheck, Clock, Loader2, X } from "lucide-react";
import shahzadaLogo from "@/assets/shahzada-logo.png";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [username, setUsername] = useState(location.state?.username || "");
  const fromRegistration = !!location.state?.username;

  const handleVerify = async () => {
    if (!username || otpValue.length !== 6) {
      toast({ title: "ত্রুটি", description: "ইউজারনেম ও ৬ সংখ্যার OTP দিন", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { username, otp_code: otpValue },
      });

      if (error || !data?.success) {
        toast({ title: "ত্রুটি", description: data?.error || "OTP ভেরিফিকেশনে সমস্যা", variant: "destructive" });
        return;
      }

      toast({ title: "সফল!", description: data.message });
      navigate("/login");
    } catch {
      toast({ title: "ত্রুটি", description: "সার্ভারে সমস্যা", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 relative">
      <Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={() => navigate("/")}>
        <X className="h-5 w-5" />
      </Button>
      <div className="mb-6 flex flex-col items-center gap-2">
        <img src={shahzadaLogo} alt="Shahzada's Hub" className="h-16 w-16 rounded-full object-cover drop-shadow-lg md:h-20 md:w-20 border-2 border-primary/20" />
        <h1 className="text-2xl font-bold text-primary md:text-3xl">OTP ভেরিফিকেশন</h1>
      </div>

      <div className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-md md:max-w-md md:p-8 space-y-5">
        {/* Waiting indicator when coming from registration */}
        {fromRegistration && (
          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Clock className="h-5 w-5 animate-pulse" />
              <span className="font-semibold">অপেক্ষা করুন</span>
            </div>
            <p className="text-sm text-muted-foreground">
              রেজিস্ট্রেশন সফল হয়েছে! আপনার অ্যাডমিনের কাছ থেকে ৬ সংখ্যার OTP সংগ্রহ করুন এবং নিচে প্রবেশ করান।
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">অ্যাডমিনের OTP অপেক্ষায়...</span>
            </div>
          </div>
        )}

        {!fromRegistration && (
          <p className="text-sm text-muted-foreground text-center">
            অ্যাডমিনের কাছ থেকে প্রাপ্ত ৬ সংখ্যার OTP কোড দিন
          </p>
        )}

        {!fromRegistration && (
          <div className="space-y-2">
            <Label>ইউজারনেম</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="আপনার ইউজারনেম"
            />
          </div>
        )}

        {fromRegistration && (
          <div className="text-center">
            <span className="text-sm text-muted-foreground">ইউজারনেম: </span>
            <span className="font-semibold text-foreground">@{username}</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          <Label>OTP কোড</Label>
          <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button onClick={handleVerify} className="w-full font-semibold" size="lg" disabled={loading || otpValue.length !== 6}>
          <ShieldCheck className="h-4 w-4" />
          {loading ? "যাচাই করা হচ্ছে..." : "ভেরিফাই করুন"}
        </Button>

        <div className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <Link to="/login" className="font-medium text-primary hover:underline">
            লগইন পেজে যান
          </Link>
          <Link to="/register" className="font-medium text-primary hover:underline">
            নতুন রেজিস্ট্রেশন
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
