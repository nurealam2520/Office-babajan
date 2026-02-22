import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <div className="mb-10 flex flex-col items-center gap-4">
        <img src={logo} alt={t("app.name")} className="h-28 w-28 drop-shadow-lg" />
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">
          {t("app.name")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("app.tagline")}
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button size="lg" className="w-full text-lg font-semibold shadow-md" onClick={() => navigate("/login")}>
          {t("index.login")}
        </Button>
        <Button size="lg" variant="outline" className="w-full text-lg font-semibold" onClick={() => navigate("/register")}>
          {t("index.register")}
        </Button>
      </div>
    </div>
  );
};

export default Index;
