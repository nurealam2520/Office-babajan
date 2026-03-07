import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ShieldCheck, Clock, Loader2, X } from "lucide-react";
import officeLogo from "@/assets/office-logo.png";
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
      toast({ title: "Error", description: "Enter username and 6-digit OTP", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { username, otp_code: otpValue },
      });

      if (error || !data?.success) {
        toast({ title: "Error", description: data?.error || "OTP verification failed", variant: "destructive" });
        return;
      }

      toast({ title: "Success!", description: data.message });
      navigate("/login");
    } catch {
      toast({ title: "Error", description: "Server error", variant: "destructive" });
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
        <img src={officeLogo} alt="Office Management" className="h-16 w-16 rounded-full object-cover drop-shadow-lg md:h-20 md:w-20 border-2 border-primary/20" />
        <h1 className="text-2xl font-bold text-primary md:text-3xl">OTP Verification</h1>
      </div>

      <div className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-md md:max-w-md md:p-8 space-y-5">
        {fromRegistration && (
          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Clock className="h-5 w-5 animate-pulse" />
              <span className="font-semibold">Please Wait</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Registration successful! Collect a 6-digit OTP from your admin and enter it below.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Waiting for admin OTP...</span>
            </div>
          </div>
        )}

        {!fromRegistration && (
          <p className="text-sm text-muted-foreground text-center">
            Enter the 6-digit OTP code received from admin
          </p>
        )}

        {!fromRegistration && (
          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
            />
          </div>
        )}

        {fromRegistration && (
          <div className="text-center">
            <span className="text-sm text-muted-foreground">Username: </span>
            <span className="font-semibold text-foreground">@{username}</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          <Label>OTP Code</Label>
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
          {loading ? "Verifying..." : "Verify"}
        </Button>

        <div className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Go to Login
          </Link>
          <Link to="/register" className="font-medium text-primary hover:underline">
            New Registration
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
