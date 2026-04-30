import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Save, KeyRound, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const { user, isReady } = useAuthReady();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [mobile, setMobile] = useState("");
  const [dob, setDob] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!user) { navigate("/login", { replace: true }); return; }

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name || "");
        setUsername(data.username || "");
        setEmployeeId(data.employee_id || "");
        setMobile(`${data.country_code || ""}${data.mobile_number || ""}`);
        setDob((data as any).date_of_birth || "");
        setJoiningDate((data as any).joining_date || "");
        setAvatarUrl((data as any).avatar_url || null);
      }
      setLoading(false);
    })();
  }, [isReady, user, navigate]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large", { description: "Max 5MB allowed." });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (upErr) {
      toast.error("Upload failed", { description: upErr.message });
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const fullUrl = `${pub.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: fullUrl } as any).eq("user_id", user.id);
    setAvatarUrl(fullUrl);
    setUploading(false);
    toast.success("Profile picture updated");
  };

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        date_of_birth: dob || null,
        joining_date: joiningDate || null,
      } as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Save failed", { description: error.message });
    } else {
      toast.success("Profile saved");
    }
  };

  const handleChangePassword = async () => {
    if (newPwd.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("Passwords do not match");
      return;
    }
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdSaving(false);
    if (error) {
      toast.error("Failed", { description: error.message });
    } else {
      toast.success("Password updated");
      setNewPwd("");
      setConfirmPwd("");
    }
  };

  if (loading || !isReady) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  }

  const initials = fullName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold">My Profile</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5 space-y-5">
        <Card>
          <CardContent className="p-5 flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-primary/20">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
                <AvatarFallback className="text-xl bg-primary/10 text-primary">{initials || "?"}</AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-primary p-2 text-primary-foreground shadow hover:bg-primary/90">
                <Camera className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleAvatarUpload}
                />
              </label>
            </div>
            {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
            <div className="text-center">
              <p className="font-semibold">{fullName}</p>
              <p className="text-xs text-muted-foreground">@{username}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-sm font-semibold">Personal Information</h2>
            <div className="space-y-2">
              <Label className="text-xs">Full Name</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Username</Label>
                <Input value={username} disabled className="opacity-60" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Employee ID</Label>
                <Input value={employeeId} disabled className="opacity-60" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Mobile</Label>
              <Input value={mobile} disabled className="opacity-60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Date of Birth</Label>
                <Input type="date" value={dob} onChange={e => setDob(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Joining Date</Label>
                <Input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Change Password</h2>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">New Password</Label>
              <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 6 characters" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Confirm Password</Label>
              <Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
            </div>
            <Button onClick={handleChangePassword} disabled={pwdSaving} variant="secondary" className="w-full gap-2">
              <Lock className="h-4 w-4" />
              {pwdSaving ? "Updating..." : "Update Password"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Forgot your password? Sign out and request a reset OTP from the login screen.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;