import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { countries } from "@/lib/countries";
import { useBusiness } from "@/contexts/BusinessContext";

const registerSchema = z.object({
  full_name: z.string().trim().min(2, "নাম কমপক্ষে ২ অক্ষরের হতে হবে").max(100),
  username: z.string().trim().min(8, "ইউজারনেম কমপক্ষে ৮ অক্ষর").max(12, "সর্বোচ্চ ১২ অক্ষর")
    .regex(/^[a-zA-Z0-9]+$/, "শুধু ইংরেজি অক্ষর ও সংখ্যা")
    .refine((val) => /[0-9]/.test(val), "কমপক্ষে একটি সংখ্যা থাকতে হবে"),
  password: z.string().min(8, "পাসওয়ার্ড কমপক্ষে ৮ অক্ষর").max(12, "সর্বোচ্চ ১২ অক্ষর"),
  country_code: z.string().min(1, "দেশ নির্বাচন করুন"),
  mobile_number: z.string().trim().min(6, "সঠিক মোবাইল নম্বর দিন").max(15).regex(/^[0-9]+$/, "শুধু সংখ্যা দিন"),
});

type RegisterForm = z.infer<typeof registerSchema>;

const BusinessRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentBusiness, getLoginPath, getAppName, businessSlug } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: "", username: "", password: "", country_code: "+880", mobile_number: "" },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("register", {
        body: { ...data, business_slug: businessSlug },
      });

      if (error || !result?.success) {
        toast({ title: "ত্রুটি", description: result?.error || "রেজিস্ট্রেশনে সমস্যা হয়েছে", variant: "destructive" });
        return;
      }

      toast({ title: "সফল!", description: result.message });
      navigate(`/${businessSlug}/verify-otp`, { state: { username: data.username } });
    } catch {
      toast({ title: "ত্রুটি", description: "সার্ভারে সমস্যা", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const themeColor = currentBusiness?.theme_color;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="mb-6 flex flex-col items-center gap-2">
        {currentBusiness?.logo_url ? (
          <img src={currentBusiness.logo_url} alt={getAppName()} className="h-16 w-16 drop-shadow-lg rounded-full object-cover" />
        ) : (
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold text-white drop-shadow-lg"
            style={{ backgroundColor: themeColor || "hsl(var(--primary))" }}
          >
            {getAppName().charAt(0)}
          </div>
        )}
        <h1 className="text-2xl font-bold" style={{ color: themeColor }}>রেজিস্ট্রেশন</h1>
        <p className="text-sm text-muted-foreground">{getAppName()} — নতুন অ্যাকাউন্ট</p>
      </div>

      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="full_name" render={({ field }) => (
              <FormItem>
                <FormLabel>সম্পূর্ণ নাম</FormLabel>
                <FormControl><Input placeholder="বাংলা বা ইংরেজিতে নাম" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="username" render={({ field }) => (
              <FormItem>
                <FormLabel>ইউজারনেম</FormLabel>
                <FormControl><Input placeholder="ইংরেজি ৮-১২ অক্ষর, সংখ্যা সহ" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>পাসওয়ার্ড</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="৮-১২ অক্ষর" {...field} />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="space-y-2">
              <FormField control={form.control} name="country_code" render={({ field }) => (
                <FormItem>
                  <FormLabel>মোবাইল নম্বর</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="দেশ নির্বাচন করুন" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.flag} {c.name} ({c.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="mobile_number" render={({ field }) => (
                <FormItem>
                  <FormControl><Input placeholder="মোবাইল নম্বর" type="tel" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <Button type="submit" className="w-full font-semibold" size="lg" disabled={loading} style={{ backgroundColor: themeColor }}>
              <UserPlus className="h-4 w-4" />
              {loading ? "অপেক্ষা করুন..." : "রেজিস্ট্রেশন করুন"}
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          ইতিমধ্যে অ্যাকাউন্ট আছে?{" "}
          <Link to={getLoginPath()} className="font-medium hover:underline" style={{ color: themeColor }}>লগইন করুন</Link>
        </div>
      </div>
    </div>
  );
};

export default BusinessRegister;
