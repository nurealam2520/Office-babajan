import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import officeLogo from "@/assets/office-logo.png";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialUsername = (location.state as any)?.username || "";
  const [username, setUsername] = useState(initialUsername);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("reset-password", {
      body: {
        username: username.trim(),
        otp_code: otp.trim(),
        new_password: newPassword,
      },
    });

    setSubmitting(false);

    if (error || (data as any)?.error) {
      toast.error("Reset failed", {
        description: (data as any)?.error || error?.message || "Invalid OTP or username",
      });
      return;
    }

    toast.success("Password reset!", { description: "You can now log in with your new password." });
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-6 flex flex-col items-center gap-2">
        <img src={officeLogo} alt="Office Management" className="h-16 w-16 rounded-full object-cover border-2 border-primary/20" />
        <h1 className="text-xl font-bold text-primary">Reset Password</h1>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Enter the OTP your admin gave you, plus your new password.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Username</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Reset OTP</Label>
              <Input
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">New Password</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Confirm Password</Label>
              <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" disabled={submitting} className="w-full gap-2">
              <ShieldCheck className="h-4 w-4" />
              {submitting ? "Resetting..." : "Reset Password"}
            </Button>
          </form>

          <div className="mt-4 flex justify-between text-xs">
            <Link to="/login" className="flex items-center gap-1 text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-3 w-3" /> Back to login
            </Link>
            <Link to="/forgot-password" className="text-primary hover:underline">
              Need an OTP?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;