import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "@/contexts/BusinessContext";

const BusinessIndex = () => {
  const navigate = useNavigate();
  const { currentBusiness, getLoginPath, getRegisterPath, getAppName } = useBusiness();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-10 flex flex-col items-center gap-4">
        {currentBusiness?.logo_url ? (
          <img src={currentBusiness.logo_url} alt={getAppName()} className="h-28 w-28 drop-shadow-lg rounded-full object-cover" />
        ) : (
          <div
            className="h-28 w-28 rounded-full flex items-center justify-center text-4xl font-bold text-white drop-shadow-lg"
            style={{ backgroundColor: currentBusiness?.theme_color || "hsl(var(--primary))" }}
          >
            {getAppName().charAt(0)}
          </div>
        )}
        <h1
          className="text-4xl font-extrabold tracking-tight"
          style={{ color: currentBusiness?.theme_color || "hsl(var(--primary))" }}
        >
          {getAppName()}
        </h1>
        <p className="text-lg text-muted-foreground">
          নিরাপদ অভ্যন্তরীণ মেসেজিং প্ল্যাটফর্ম
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          size="lg"
          className="w-full text-lg font-semibold shadow-md"
          style={{ backgroundColor: currentBusiness?.theme_color }}
          onClick={() => navigate(getLoginPath())}
        >
          লগইন করুন
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full text-lg font-semibold"
          style={{ borderColor: currentBusiness?.theme_color, color: currentBusiness?.theme_color }}
          onClick={() => navigate(getRegisterPath())}
        >
          রেজিস্ট্রেশন করুন
        </Button>
      </div>
    </div>
  );
};

export default BusinessIndex;
