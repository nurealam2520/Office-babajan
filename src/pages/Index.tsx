import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { MessageCircle, Shield, Users } from "lucide-react";

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

      {/* Features */}
      <div className="mb-10 grid max-w-md grid-cols-1 gap-4 sm:grid-cols-3">
        <FeatureCard icon={<Shield className="h-6 w-6" />} title="সুরক্ষিত" desc="OTP ভিত্তিক অ্যাকাউন্ট" />
        <FeatureCard icon={<Users className="h-6 w-6" />} title="গ্রুপ" desc="৩০০ সদস্য পর্যন্ত" />
        <FeatureCard icon={<MessageCircle className="h-6 w-6" />} title="মেসেজিং" desc="টেক্সট, ছবি, অডিও" />
      </div>

      {/* CTA */}
      <Button size="lg" className="px-10 text-lg font-semibold shadow-md">
        লগইন করুন
      </Button>
    </div>
  );
};

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-5 text-center shadow-sm">
      <div className="text-primary">{icon}</div>
      <p className="font-semibold text-card-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

export default Index;
