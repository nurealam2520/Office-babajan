import { useLanguage, Language } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  const toggle = () => {
    setLanguage(language === "bn" ? "en" : "bn");
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggle} title={language === "bn" ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}>
      <span className="text-xs font-bold">{language === "bn" ? "EN" : "বাং"}</span>
    </Button>
  );
};

export default LanguageToggle;
