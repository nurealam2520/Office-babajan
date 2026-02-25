import shahzadaLogo from "@/assets/shahzada-logo.png";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import { LogIn, UserPlus, ShieldCheck } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <div className="mb-10 flex flex-col items-center gap-4">
        <img
          src={shahzadaLogo}
          alt="Shahzada's Hub"
          className="h-32 w-32 rounded-full object-cover shadow-xl border-4 border-primary/20"
        />
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">
          Shahzada's Hub
        </h1>
        <p className="text-center text-base text-muted-foreground max-w-xs leading-relaxed italic">
          "আপনার কাজই আপনার পরিচয়, আর আপনার দায়িত্বই আপনার শক্তি।"
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button size="lg" className="w-full text-lg font-semibold shadow-md gap-2" onClick={() => navigate("/login")}>
          <LogIn className="h-5 w-5" />
          {t("index.login")}
        </Button>
        <Button size="lg" variant="outline" className="w-full text-lg font-semibold gap-2" onClick={() => navigate("/register")}>
          <UserPlus className="h-5 w-5" />
          {t("index.register")}
        </Button>
        <Button size="lg" variant="secondary" className="w-full text-lg font-semibold gap-2" onClick={() => navigate("/verify-otp")}>
          <ShieldCheck className="h-5 w-5" />
          OTP ভেরিফাই
        </Button>
      </div>
    </div>
  );
};

export default Index;
