import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Logo & Title */}
      <div className="mb-10 flex flex-col items-center gap-4">
        <img src={logo} alt="মাইজমেসেজ লোগো" className="h-28 w-28 drop-shadow-lg" />
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">
          মাইজমেসেজ
        </h1>
        <p className="text-lg text-muted-foreground">
          নিরাপদ অভ্যন্তরীণ মেসেজিং প্ল্যাটফর্ম
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button size="lg" className="w-full text-lg font-semibold shadow-md">
          লগইন করুন
        </Button>
        <Button size="lg" variant="outline" className="w-full text-lg font-semibold">
          রেজিস্ট্রেশন করুন
        </Button>
      </div>
    </div>
  );
};

export default Index;
