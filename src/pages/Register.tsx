import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, UserPlus, X } from "lucide-react";
import officeLogo from "@/assets/office-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { countries } from "@/lib/countries";

const registerSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  username: z
    .string()
    .trim()
    .min(8, "Username must be at least 8 characters")
    .max(12, "Username must be at most 12 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Only English letters and numbers allowed")
    .refine((val) => /[0-9]/.test(val), "Must contain at least one number"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(12, "Password must be at most 12 characters"),
  country_code: z.string().min(1, "Select a country"),
  mobile_number: z
    .string()
    .trim()
    .min(6, "Enter a valid mobile number")
    .max(15, "Enter a valid mobile number")
    .regex(/^[0-9]+$/, "Only numbers allowed"),
});

type RegisterForm = z.infer<typeof registerSchema>;

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      username: "",
      password: "",
      country_code: "+880",
      mobile_number: "",
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("register", {
        body: data,
      });

      if (error || !result?.success) {
        toast({
          title: "Error",
          description: result?.error || "Registration failed",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success!",
        description: result.message,
      });

      navigate("/verify-otp", { state: { username: data.username } });
    } catch {
      toast({
        title: "Error",
        description: "Server error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 relative">
      <Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={() => navigate("/")}>
        <X className="h-5 w-5" />
      </Button>
      <div className="mb-6 flex flex-col items-center gap-2">
        <img src={officeLogo} alt="Office Management" className="h-16 w-16 rounded-full object-cover drop-shadow-lg border-2 border-primary/20" />
        <h1 className="text-2xl font-bold text-primary">Registration</h1>
        <p className="text-sm text-muted-foreground">Create a new account</p>
      </div>

      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="8-12 characters with numbers" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="8-12 characters"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormField
                control={form.control}
                name="country_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.flag} {c.name} ({c.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobile_number"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Mobile number" type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full font-semibold" size="lg" disabled={loading}>
              <UserPlus className="h-4 w-4" />
              {loading ? "Please wait..." : "Register"}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
