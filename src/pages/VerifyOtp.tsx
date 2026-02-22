import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-6 flex flex-col items-center gap-2">
        <img src={logo} alt="মাইজমেসেজ" className="h-16 w-16 drop-shadow-lg" />
        <h1 className="text-2xl font-bold text-primary">OTP ভেরিফিকেশন</h1>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          অ্যাডমিনের কাছ থেকে প্রাপ্ত ৬ সংখ্যার OTP কোড দিন
        </p>
      </div>

      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-md space-y-5">
        {!location.state?.username && (
          <div className="space-y-2">
            <Label>ইউজারনেম</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="আপনার ইউজারনেম"
            />
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

        <Button onClick={handleVerify} className="w-full font-semibold" size="lg" disabled={loading}>
          <ShieldCheck className="h-4 w-4" />
          {loading ? "যাচাই করা হচ্ছে..." : "ভেরিফাই করুন"}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            লগইন পেজে যান
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
