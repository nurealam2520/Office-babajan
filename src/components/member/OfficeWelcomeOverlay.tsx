import { useState, useEffect } from "react";
import { CheckCircle, Clock, Sun, Moon, Sunset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  fullName: string;
  onStartAttendance: () => void;
  hasCheckedInToday: boolean;
}

const WELCOME_KEY = "office_welcome_last_shown";
const GAP_HOURS = 10;

const OfficeWelcomeOverlay = ({ fullName, onStartAttendance, hasCheckedInToday }: Props) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasCheckedInToday) return;

    const lastShown = localStorage.getItem(WELCOME_KEY);
    const now = Date.now();

    if (!lastShown || now - parseInt(lastShown) > GAP_HOURS * 3600000) {
      setVisible(true);
    }
  }, [hasCheckedInToday]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "সুপ্রভাত", icon: Sun };
    if (hour < 17) return { text: "শুভ অপরাহ্ন", icon: Sunset };
    return { text: "শুভ সন্ধ্যা", icon: Moon };
  };

  const handleStart = () => {
    localStorage.setItem(WELCOME_KEY, Date.now().toString());
    setVisible(false);
    onStartAttendance();
  };

  const handleDismiss = () => {
    localStorage.setItem(WELCOME_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  const now = new Date();
  const timeStr = now.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("bn-BD", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-2xl">
        <CardContent className="py-8 px-6 text-center space-y-5">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <GreetingIcon className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-lg font-bold text-foreground">{greeting.text}!</p>
            <p className="text-xl font-bold text-primary">{fullName}</p>
          </div>

          <div className="space-y-0.5 text-sm text-muted-foreground">
            <p>{dateStr}</p>
            <p className="flex items-center justify-center gap-1.5">
              <Clock className="h-4 w-4" /> সময়: {timeStr}
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <Button
              onClick={handleStart}
              size="lg"
              className="w-full gap-2 text-base"
            >
              <CheckCircle className="h-5 w-5" />
              অফিস শুরু করুন (চেক-ইন)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-xs text-muted-foreground"
            >
              পরে চেক-ইন করব
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfficeWelcomeOverlay;
