import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import officeLogo from "@/assets/office-logo.png";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim()) return;
    setSubmitting(true);

    // Look up user by username or mobile
    const trimmed = loginId.trim();
    const isMobile = /^[+]?\d+$/.test(trimmed);
    let query = supabase.from("profiles").select("user_id, username, mobile_number");
    if (isMobile) {
      query = query.or(`mobile_number.eq.${trimmed},mobile_number.eq.+880${trimmed}`);
    } else {
      query = query.eq("username", trimmed);
    }
    const { data: profile } = await query.maybeSingle();

    if (!profile) {
      setSubmitting(false);
      toast.error("User not found", {
        description: "Please check your username or mobile number.",
      });
      return;
    }

    // Check if a pending request already exists
    const { data: existing } = await supabase
      .from("password_reset_requests" as any)
      .select("id, status")
      .eq("user_id", profile.user_id)
      .in("status", ["pending", "approved"])
      .maybeSingle();

    if (existing) {
      setSubmitting(false);
      toast.info("Request already pending", {
        description: "Please contact your admin or wait for an OTP.",
      });
      navigate("/reset-password", { state: { username: profile.username } });
      return;
    }

    const { error } = await (supabase.from("password_reset_requests" as any) as any).insert({
      user_id: profile.user_id,
      username: profile.username,
      mobile_number: profile.mobile_number,
      status: "pending",
    });

    setSubmitting(false);

    if (error) {
      toast.error("Could not submit request", { description: error.message });
      return;
    }

    toast.success("Request submitted", {
      description: "Contact your admin to receive a reset OTP.",
    });
    navigate("/reset-password", { state: { username: profile.username } });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-6 flex flex-col items-center gap-2">
        <img src={officeLogo} alt="Office Management" className="h-16 w-16 rounded-full object-cover border-2 border-primary/20" />
        <h1 className="text-xl font-bold text-primary">Forgot Password</h1>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Enter your username or mobile number. Your admin will issue an OTP to reset your password.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Username or Mobile</Label>
              <Input
                placeholder="Enter username or mobile number"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full gap-2">
              <KeyRound className="h-4 w-4" />
              {submitting ? "Submitting..." : "Request Password Reset"}
            </Button>
          </form>

          <div className="mt-4 flex justify-between text-xs">
            <Link to="/login" className="flex items-center gap-1 text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-3 w-3" /> Back to login
            </Link>
            <Link to="/reset-password" className="text-primary hover:underline">
              Already have OTP?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;